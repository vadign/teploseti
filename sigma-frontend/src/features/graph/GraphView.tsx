import { Button, Card, Checkbox, Col, Input, Row, Select, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SemanticsBanner from '../../components/SemanticsBanner';
import SeverityTag from '../../components/SeverityTag';
import { useAppStore } from '../../app/store';
import { formatDateTime } from '../../utils';
import type { DeviationEvent, NetEdge, NetNode } from '../../types';

const nodeStyles = {
  source: { color: '#1677ff', label: 'И' },
  junction: { color: '#10b981', label: 'У' },
  heat_substation: { color: '#f97316', label: 'Т' }
} as const;

const statusColors: Record<'ok' | 'info' | 'warning' | 'critical', string> = {
  ok: '#94a3b8',
  info: '#60a5fa',
  warning: '#f59e0b',
  critical: '#ef4444'
};

interface GraphNode extends NetNode {
  fx: number;
  fy: number;
  label: string;
}

interface PopoverState {
  type: 'node' | 'edge';
  id: string;
  name: string;
  district?: string;
  address?: string;
  events: DeviationEvent[];
  position: { x: number; y: number };
}

type LayerType = 'supply' | 'return';

const GraphView = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const graphRef = useRef<ForceGraphMethods>();
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string[]>([]);
  const [layers, setLayers] = useState<LayerType[]>(['supply', 'return']);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [{ width: canvasWidth, height: canvasHeight }, setCanvasSize] = useState({
    width: 0,
    height: 0
  });

  const network = useAppStore((state) => state.network);
  const selectedDate = useAppStore((state) => state.ui.selectedDate);
  const eventsByObject = useAppStore((state) => state.eventsByObject);
  const edgeStatus = useAppStore((state) => state.edgeStatus);
  const setFocusedObject = useAppStore((state) => state.setFocusedObject);

  const nodes = useMemo<GraphNode[]>(
    () =>
      network.nodes.map((node) => ({
        ...node,
        fx: node.x,
        fy: node.y,
        label: `${node.name}\n${node.district}${node.address ? `\n${node.address}` : ''}`
      })),
    [network.nodes]
  );

  const edgeLayerMap = useMemo(() => {
    const map: Record<string, 'supply' | 'return'> = {};
    network.edges.forEach((edge) => {
      map[edge.id] = edge.plan.pressure_bar_plan <= 2.5 ? 'return' : 'supply';
    });
    return map;
  }, [network.edges]);

  const activeLayers = useMemo(
    () => new Set(layers.length ? (layers as LayerType[]) : ['supply', 'return']),
    [layers]
  );

  const filteredNodes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return nodes.filter((node) => {
      const matchesTerm = term
        ? node.name.toLowerCase().includes(term) || node.district.toLowerCase().includes(term)
        : true;
      const matchesDistrict = districtFilter.length
        ? districtFilter.includes(node.district)
        : true;
      return matchesTerm && matchesDistrict;
    });
  }, [nodes, searchTerm, districtFilter]);

  const nodeSet = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredLinks = useMemo(() => {
    return network.edges.filter((edge) => {
      const layer = edgeLayerMap[edge.id];
      if (!activeLayers.has(layer)) {
        return false;
      }
      return nodeSet.has(edge.from) && nodeSet.has(edge.to);
    });
  }, [network.edges, nodeSet, activeLayers, edgeLayerMap]);

  useLayoutEffect(() => {
    const element = canvasContainerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const focusId = searchParams.get('focus');

  useEffect(() => {
    if (!focusId) {
      setFocusedObject(undefined);
      return;
    }
    const node = network.nodes.find((n) => n.id === focusId);
    if (node) {
      setFocusedObject({ id: node.id, objectType: 'node' });
      setDistrictFilter((current) => (current.length ? current : [node.district]));
      setSearchTerm(node.name);
      const matched = nodes.find((item) => item.id === node.id);
      if (matched && graphRef.current) {
        graphRef.current.centerAt(matched.fx, matched.fy, 600);
        graphRef.current.zoom(1.6, 800);
      }
      return;
    }
    const edge = network.edges.find((e) => e.id === focusId);
    if (edge) {
      setFocusedObject({ id: edge.id, objectType: 'edge' });
      const fromNode = nodes.find((item) => item.id === edge.from);
      const toNode = nodes.find((item) => item.id === edge.to);
      if (fromNode && toNode && graphRef.current) {
        const fx = (fromNode.fx + toNode.fx) / 2;
        const fy = (fromNode.fy + toNode.fy) / 2;
        graphRef.current.centerAt(fx, fy, 600);
        graphRef.current.zoom(1.4, 800);
      }
    }
  }, [focusId, network.edges, network.nodes, nodes, setFocusedObject]);

  const updateSearchParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    updater(params);
    setSearchParams(params);
  };

  const handleNodeClick = (node: GraphNode, event: MouseEvent) => {
    setFocusedObject({ id: node.id, objectType: 'node' });
    updateSearchParams((params) => params.set('focus', node.id));
    setPopover({
      type: 'node',
      id: node.id,
      name: node.name,
      district: node.district,
      address: node.address,
      events: eventsByObject(node.id),
      position: { x: event.clientX, y: event.clientY }
    });
  };

  const handleLinkClick = (link: NetEdge, event: MouseEvent) => {
    setFocusedObject({ id: link.id, objectType: 'edge' });
    updateSearchParams((params) => params.set('focus', link.id));
    setPopover({
      type: 'edge',
      id: link.id,
      name: `${network.nodes.find((n) => n.id === link.from)?.name ?? link.from} → ${
        network.nodes.find((n) => n.id === link.to)?.name ?? link.to
      }`,
      district: network.nodes.find((n) => n.id === link.from)?.district,
      events: eventsByObject(link.id),
      position: { x: event.clientX, y: event.clientY }
    });
  };

  const resolveTwinId = (item: PopoverState) => {
    if (item.type === 'node') {
      return item.id;
    }
    const edge = network.edges.find((entry) => entry.id === item.id);
    if (!edge) return undefined;
    const toNode = network.nodes.find((node) => node.id === edge.to && node.type === 'heat_substation');
    const fromNode = network.nodes.find((node) => node.id === edge.from && node.type === 'heat_substation');
    return toNode?.id ?? fromNode?.id;
  };

  return (
    <div className="graph-container">
      <SemanticsBanner />
      <Row gutter={[16, 16]} className="search-panel">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Input.Search
            placeholder="Поиск по названию или району"
            allowClear
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Select
            mode="multiple"
            placeholder="Фильтр по району"
            style={{ width: '100%' }}
            allowClear
            value={districtFilter}
            onChange={(value) => setDistrictFilter(value)}
            options={Array.from(new Set(network.nodes.map((node) => node.district))).map((district) => ({
              label: district,
              value: district
            }))}
          />
        </Col>
        <Col xs={24} sm={24} md={8} lg={6}>
          <Checkbox.Group
            options={[
              { label: 'Подача', value: 'supply' },
              { label: 'Обратка', value: 'return' }
            ]}
            value={layers}
            onChange={(value) => setLayers(value as LayerType[])}
          />
        </Col>
        <Col xs={24} sm={24} md={8} lg={6}>
          <Tag color="geekblue">Дата среза: {dayjs(selectedDate).format('DD.MM.YYYY')}</Tag>
        </Col>
      </Row>
      <div
        ref={canvasContainerRef}
        style={{ flex: 1, minHeight: 320, position: 'relative', minWidth: 0 }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: filteredNodes, links: filteredLinks }}
          width={canvasWidth || undefined}
          height={canvasHeight || undefined}
          linkSource="from"
          linkTarget="to"
          nodeLabel={(node: GraphNode) => node.label}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={0.9}
          enableNodeDrag={false}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D) => {
            const style = nodeStyles[node.type];
            const radius = 9;
            ctx.beginPath();
            ctx.fillStyle = style.color;
            ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.font = '10px Inter';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(style.label, node.x ?? 0, (node.y ?? 0) + 1);
          }}
          nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, 12, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          linkColor={(link: NetEdge) => {
            const status = edgeStatus(link.id);
            return statusColors[status] ?? statusColors.ok;
          }}
          linkWidth={(link: NetEdge) => {
            const status = edgeStatus(link.id);
            if (status === 'critical') return 3;
            if (status === 'warning') return 2;
            return 1;
          }}
          onNodeClick={(node: unknown, event: MouseEvent) =>
            handleNodeClick(node as GraphNode, event)
          }
          onLinkClick={(link: unknown, event: MouseEvent) =>
            handleLinkClick(link as NetEdge, event)
          }
          onBackgroundClick={() => {
            setPopover(null);
            setFocusedObject(undefined);
            updateSearchParams((params) => params.delete('focus'));
          }}
          cooldownTicks={0}
        />
        {popover ? (
          <Card
            className="graph-popover-card"
            style={{ left: popover.position.x, top: popover.position.y }}
            title={popover.name}
            extra={<Tag color="blue">{popover.type === 'node' ? 'Узел' : 'Участок'}</Tag>}
          >
            {popover.district ? (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                Район: {popover.district}
              </Typography.Paragraph>
            ) : null}
            {popover.address ? (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                Адрес: {popover.address}
              </Typography.Paragraph>
            ) : null}
            <Typography.Paragraph strong>
              События ({popover.events.length})
            </Typography.Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
              {popover.events.slice(0, 3).map((event) => (
                <Space key={event.id} size={8}>
                  <SeverityTag severity={event.severity} />
                  <Typography.Text>{formatDateTime(event.timestamp)}</Typography.Text>
                </Space>
              ))}
              {!popover.events.length ? (
                <Typography.Text type="secondary">
                  На выбранную дату отклонений не зарегистрировано
                </Typography.Text>
              ) : null}
            </Space>
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                disabled={!resolveTwinId(popover)}
                onClick={() => {
                  const target = resolveTwinId(popover);
                  if (target) {
                    navigate(`/dt/${target}`);
                  }
                }}
              >
                Открыть карточку
              </Button>
              <Button onClick={() => navigate(`/events?objectId=${popover.id}`)}>К событиям</Button>
            </Space>
          </Card>
        ) : null}
      </div>
      <div className="graph-legend">
        <div className="graph-legend-item">
          <span className="graph-legend-dot" style={{ background: statusColors.critical }} />
          Критические отклонения
        </div>
        <div className="graph-legend-item">
          <span className="graph-legend-dot" style={{ background: statusColors.warning }} />
          Предупреждения
        </div>
        <div className="graph-legend-item">
          <span className="graph-legend-dot" style={{ background: statusColors.ok }} />
          Плановые параметры
        </div>
      </div>
    </div>
  );
};

export default GraphView;
