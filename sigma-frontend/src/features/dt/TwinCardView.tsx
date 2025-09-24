import { Button, Card, Result } from 'antd';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SemanticsBanner from '../../components/SemanticsBanner';
import { useAppStore } from '../../app/store';
import TwinHeader from './TwinHeader';
import TwinPanels from './TwinPanels';

const TwinCardView = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const setObjectFilter = useAppStore((state) => state.setObjectFilter);
  const setFocusedObject = useAppStore((state) => state.setFocusedObject);
  const twin = useAppStore((state) => (id ? state.twinFromNode(id) : undefined));
  const node = useAppStore((state) => (id ? state.getNodeById(id) : undefined));
  const events = useAppStore((state) => (id ? state.eventsByObject(id) : []));
  const network = useAppStore((state) => state.network);
  const regulations = useAppStore((state) => state.regulations);

  useEffect(() => {
    if (id) {
      setObjectFilter(id);
      setFocusedObject({ id, objectType: 'node' });
    }
    return () => setFocusedObject(undefined);
  }, [id, setFocusedObject, setObjectFilter]);

  const edges = useMemo(() => network.edges.filter((edge) => edge.from === id || edge.to === id), [
    id,
    network.edges
  ]);

  const regulationDetails = useMemo(() => {
    const map = new Map<string, Set<string>>();
    events.forEach((event) => {
      if (!map.has(event.rule.regulationId)) {
        map.set(event.rule.regulationId, new Set());
      }
      map.get(event.rule.regulationId)?.add(event.rule.version);
    });
    twin?.regulations.forEach((reg) => {
      if (!map.has(reg.id)) {
        map.set(reg.id, new Set());
      }
    });
    return Array.from(map.entries()).map(([regId, versions]) => ({
      regulation: regulations.find((reg) => reg.id === regId) ?? { id: regId, title: regId },
      versions: versions.size ? Array.from(versions) : ['—']
    }));
  }, [events, regulations, twin?.regulations]);

  if (!id || !node || node.type !== 'heat_substation' || !twin) {
    return (
      <Card className="app-card">
        <Result
          status="404"
          title="Карточка недоступна"
          subTitle="Проверьте корректность идентификатора теплового узла."
          extra={
            <Button type="primary" onClick={() => navigate('/graph')}>
              Вернуться к графу
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="app-card">
      <SemanticsBanner />
      <TwinHeader
        twin={twin}
        onShowEvents={() => navigate(`/events?objectId=${twin.id}`)}
        onShowGraph={() => navigate(`/graph?focus=${twin.id}`)}
      />
      <TwinPanels
        edges={edges}
        nodes={network.nodes}
        events={events}
        regulations={regulationDetails}
        sources={twin.sources}
      />
    </Card>
  );
};

export default TwinCardView;
