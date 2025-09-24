import { Card, Descriptions, List, Space, Tag, Typography } from 'antd';
import type { DeviationEvent, NetEdge, NetNode, RegulationRef } from '../../types';
import { eventTypeLabels, formatDateTime, formatValueRange, getEdgeDirectionLabel } from '../../utils';
import SeverityTag from '../../components/SeverityTag';

interface TwinPanelsProps {
  edges: NetEdge[];
  nodes: NetNode[];
  events: DeviationEvent[];
  regulations: Array<{ regulation: RegulationRef; versions: string[] }>;
  sources: string[];
}

const TwinPanels = ({ edges, nodes, events, regulations, sources }: TwinPanelsProps) => {
  return (
    <div className="twin-panels">
      <Card title="Плановые параметры участков" bordered className="app-card">
        <Descriptions column={1} bordered size="small">
          {edges.map((edge) => (
            <Descriptions.Item key={edge.id} label={getEdgeDirectionLabel(edge, nodes)}>
              <Space direction="vertical" size={4}>
                <Typography.Text>Диаметр: {edge.plan.diameter_mm} мм</Typography.Text>
                <Typography.Text>Расход: {edge.plan.flow_kg_s_plan} кг/с</Typography.Text>
                <Typography.Text>Давление: {edge.plan.pressure_bar_plan} бар</Typography.Text>
                {edge.plan.temp_c_plan_min !== undefined || edge.plan.temp_c_plan_max !== undefined ? (
                  <Typography.Text>
                    Температура план: {edge.plan.temp_c_plan_min ?? '—'} … {edge.plan.temp_c_plan_max ?? '—'} °C
                  </Typography.Text>
                ) : null}
              </Space>
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
      <Space direction="vertical" size={16}>
        <Card title="Лента отклонений" bordered className="app-card">
          <List
            dataSource={events}
            locale={{ emptyText: 'На выбранную дату отклонения не зафиксированы.' }}
            renderItem={(event) => (
              <List.Item key={event.id}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <Space align="center" size={12}>
                    <SeverityTag severity={event.severity} />
                    <Typography.Text strong>{eventTypeLabels[event.type]}</Typography.Text>
                    <Typography.Text type="secondary">{formatDateTime(event.timestamp)}</Typography.Text>
                  </Space>
                  <Typography.Text>
                    {formatValueRange(event.measuredValue, event.expectedMin, event.expectedMax)}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Правило: {event.rule.id} · Версия {event.rule.version} · Регламент {event.rule.regulationId}
                  </Typography.Text>
                  {event.comment ? (
                    <Typography.Text type="secondary">Комментарий: {event.comment}</Typography.Text>
                  ) : null}
                </Space>
              </List.Item>
            )}
          />
        </Card>
        <Card title="Применённые регламенты" bordered className="app-card">
          <List
            dataSource={regulations}
            locale={{ emptyText: 'Регламентные ссылки не указаны.' }}
            renderItem={({ regulation, versions }) => (
              <List.Item key={regulation.id}>
                <Space direction="vertical" size={4}>
                  <Typography.Text strong>{regulation.title}</Typography.Text>
                  <Space wrap>
                    {versions.map((version) => (
                      <Tag key={version} color="purple">
                        Версия {version}
                      </Tag>
                    ))}
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        </Card>
        <Card title="Источники данных" bordered className="app-card">
          <Space wrap>
            {sources.map((source) => (
              <Tag key={source} color="geekblue">
                {source}
              </Tag>
            ))}
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default TwinPanels;
