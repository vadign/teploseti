import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  FireOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SemanticsBanner from '../../components/SemanticsBanner';
import SeverityTag from '../../components/SeverityTag';
import { useAppStore } from '../../app/store';
import { eventTypeLabels, formatDateTime, formatValueRange, severityTitles } from '../../utils';
import type { DeviationEvent, Severity } from '../../types';

const { RangePicker } = DatePicker;

dayjs.extend(isBetween);

interface EventRow extends DeviationEvent {
  objectName?: string;
  district?: string;
}

const severityIcons: Record<Severity, ReactNode> = {
  info: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  critical: <FireOutlined />
};

const eventTypeIcons: Record<DeviationEvent['type'], ReactNode> = {
  pressure_low: <ArrowDownOutlined />,
  pressure_high: <ArrowUpOutlined />,
  temperature_low: <ArrowDownOutlined />,
  temperature_high: <ArrowUpOutlined />,
  leak_suspected: <WarningOutlined />,
  data_completeness: <CheckCircleOutlined />
};

const EventsView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedDate = useAppStore((state) => state.ui.selectedDate);
  const filters = useAppStore((state) => state.ui.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  const resetFilters = useAppStore((state) => state.resetFilters);
  const setObjectFilter = useAppStore((state) => state.setObjectFilter);
  const eventsForDate = useAppStore((state) => state.eventsForDate);
  const getObjectName = useAppStore((state) => state.getObjectName);
  const getObjectDistrict = useAppStore((state) => state.getObjectDistrict);
  const getNodeById = useAppStore((state) => state.getNodeById);
  const network = useAppStore((state) => state.network);

  useEffect(() => {
    const objectId = searchParams.get('objectId');
    if (objectId) {
      setFilters({ objectId });
      setObjectFilter(objectId);
    }
  }, [searchParams, setFilters, setObjectFilter]);

  const allEvents = useMemo(() => eventsForDate(selectedDate), [eventsForDate, selectedDate]);

  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((event) => {
        if (filters.dateRange) {
          const [start, end] = filters.dateRange;
          const ts = dayjs(event.timestamp);
          if (!ts.isBetween(dayjs(start).startOf('day'), dayjs(end).endOf('day'), null, '[]')) {
            return false;
          }
        }
        if (filters.severity.length && !filters.severity.includes(event.severity)) {
          return false;
        }
        if (filters.types.length && !filters.types.includes(event.type)) {
          return false;
        }
        if (filters.ruleVersion && event.rule.version !== filters.ruleVersion) {
          return false;
        }
        if (filters.districts.length) {
          const district = getObjectDistrict(event.objectId);
          if (!district || !filters.districts.includes(district)) {
            return false;
          }
        }
        if (filters.objectId) {
          const objectId = filters.objectId;
          if (event.objectId === objectId) {
            return true;
          }
          const node = getNodeById(objectId);
          if (node) {
            return (
              event.objectId === objectId ||
              network.edges.some(
                (edge) =>
                  (edge.from === objectId || edge.to === objectId) &&
                  edge.id === event.objectId
              )
            );
          }
          return false;
        }
        return true;
      })
      .map((event) => ({
        ...event,
        objectName: getObjectName(event.objectId),
        district: getObjectDistrict(event.objectId)
      }));
  }, [
    allEvents,
    filters.dateRange,
    filters.districts,
    filters.objectId,
    filters.ruleVersion,
    filters.severity,
    filters.types,
    getNodeById,
    getObjectDistrict,
    getObjectName,
    network.edges,
  ]);

  const severityCounters = useMemo(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        acc[event.severity] += 1;
        acc.total += 1;
        return acc;
      },
      { info: 0, warning: 0, critical: 0, total: 0 }
    );
  }, [filteredEvents]);

  const columns: ColumnsType<EventRow> = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      ellipsis: true,
      render: (value: string) => (
        <Typography.Text className="text-ellipsis">{formatDateTime(value)}</Typography.Text>
      )
    },
    {
      title: 'Тип события',
      dataIndex: 'type',
      key: 'type',
      width: 180,
      ellipsis: true,
      render: (value: DeviationEvent['type']) => (
        <Space size={8}>
          {eventTypeIcons[value]}
          <Typography.Text className="text-ellipsis">{eventTypeLabels[value]}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Критичность',
      dataIndex: 'severity',
      key: 'severity',
      width: 140,
      render: (value: Severity) => <SeverityTag severity={value} />
    },
    {
      title: 'Объект',
      dataIndex: 'objectName',
      key: 'objectName',
      width: 260,
      render: (_: unknown, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Typography.Text strong className="text-ellipsis">
            {record.objectName ?? record.objectId}
          </Typography.Text>
          <Typography.Text type="secondary" className="text-ellipsis">
            {record.objectId}
          </Typography.Text>
          {record.district ? (
            <Tag color="blue" className="text-ellipsis">
              {record.district}
            </Tag>
          ) : (
            <Tag>Не определён</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Значение / Диапазон',
      dataIndex: 'measuredValue',
      key: 'value',
      ellipsis: true,
      render: (_: unknown, record) =>
        (
          <Typography.Text className="text-ellipsis">
            {formatValueRange(record.measuredValue, record.expectedMin, record.expectedMax)}
          </Typography.Text>
        )
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (value?: string) => (
        <Typography.Text className="text-ellipsis">{value ?? '—'}</Typography.Text>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 160,
      render: (_: unknown, record) => {
        const twinId = (() => {
          if (record.objectType === 'node') {
            const node = getNodeById(record.objectId);
            if (node?.type === 'heat_substation') {
              return node.id;
            }
            return undefined;
          }
          const edge = network.edges.find((item) => item.id === record.objectId);
          if (!edge) {
            return undefined;
          }
          const toNode = getNodeById(edge.to);
          const fromNode = getNodeById(edge.from);
          return [toNode, fromNode].find((node) => node?.type === 'heat_substation')?.id;
        })();

        return (
          <Space size={4} wrap>
            <Button
              type="link"
              size="small"
              disabled={!twinId}
              onClick={() => twinId && navigate(`/dt/${twinId}`)}
            >
              Карточка ЦД
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/graph?focus=${record.objectId}`)}
            >
              Показать на графе
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <Card className="app-card events-card">
      <SemanticsBanner />
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Space size={24} wrap>
          <Statistic title="Всего" value={severityCounters.total} />
          <Statistic
            title={severityTitles.info}
            value={severityCounters.info}
            prefix={severityIcons.info}
          />
          <Statistic
            title={severityTitles.warning}
            value={severityCounters.warning}
            prefix={severityIcons.warning}
          />
          <Statistic
            title={severityTitles.critical}
            value={severityCounters.critical}
            prefix={severityIcons.critical}
          />
        </Space>
        <Button onClick={() => resetFilters()}>Сбросить фильтры</Button>
      </Flex>
      <Form layout="vertical">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item label="Критичность">
              <Select
                mode="multiple"
                allowClear
                placeholder="Выберите"
                value={filters.severity}
                onChange={(value) => setFilters({ severity: value })}
                options={['info', 'warning', 'critical'].map((value) => ({
                  label: severityTitles[value as Severity],
                  value
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item label="Тип события">
              <Select
                mode="multiple"
                allowClear
                placeholder="Все типы"
                value={filters.types}
                onChange={(value) => setFilters({ types: value })}
                options={(Object.keys(eventTypeLabels) as DeviationEvent['type'][]).map((value) => ({
                  label: eventTypeLabels[value],
                  value
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item label="Район">
              <Select
                mode="multiple"
                allowClear
                placeholder="Все районы"
                value={filters.districts}
                onChange={(value) => setFilters({ districts: value })}
                options={Array.from(new Set(network.nodes.map((node) => node.district))).map((district) => ({
                  label: district,
                  value: district
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item label="Объект">
              <Select
                showSearch
                allowClear
                placeholder="Любой"
                value={filters.objectId}
                onChange={(value) => {
                  setFilters({ objectId: value });
                  setObjectFilter(value);
                }}
                options={network.nodes
                  .filter((node) => node.type === 'heat_substation')
                  .map((node) => ({
                    label: `${node.name}${node.address ? ` — ${node.address}` : ''}`,
                    value: node.id
                  }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item label="Версия правила">
              <Select
                allowClear
                placeholder="Любая"
                value={filters.ruleVersion}
                onChange={(value) => setFilters({ ruleVersion: value })}
                options={Array.from(new Set(allEvents.map((event) => event.rule.version))).map((version) => ({
                  label: version,
                  value: version
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item label="Интервал дат">
              <RangePicker
                value={
                  filters.dateRange
                    ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])]
                    : undefined
                }
                onChange={(range) => {
                  if (!range) {
                    setFilters({ dateRange: undefined });
                  } else {
                    setFilters({
                      dateRange: [range[0]?.format('YYYY-MM-DD') ?? '', range[1]?.format('YYYY-MM-DD') ?? '']
                    });
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <div className="events-table-wrapper">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredEvents}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1400, y: 320 }}
        />
      </div>
    </Card>
  );
};

export default EventsView;
