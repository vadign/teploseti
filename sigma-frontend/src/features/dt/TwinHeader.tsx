import { BankOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Button, Progress, Space, Tag, Typography } from 'antd';
import type { DigitalTwin } from '../../types';
import { nodeTypeLabels, severityColors, severityTitles } from '../../utils';

interface TwinHeaderProps {
  twin: DigitalTwin;
  onShowEvents: () => void;
  onShowGraph: () => void;
}

const TwinHeader = ({ twin, onShowEvents, onShowGraph }: TwinHeaderProps) => {
  const chips = [
    { key: 'info', label: severityTitles.info, value: twin.eventsCount.info },
    { key: 'warning', label: severityTitles.warning, value: twin.eventsCount.warning },
    { key: 'critical', label: severityTitles.critical, value: twin.eventsCount.critical }
  ] as const;

  return (
    <div style={{ marginBottom: 24 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space align="center" size={12} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {twin.name}
          </Typography.Title>
          <Tag icon={<BankOutlined />} color="geekblue">
            {nodeTypeLabels[twin.type]}
          </Tag>
        </Space>
        {twin.address ? (
          <Typography.Text type="secondary">
            <EnvironmentOutlined /> {twin.address}
          </Typography.Text>
        ) : null}
        <Typography.Text type="secondary">Район: {twin.district}</Typography.Text>
        <Space wrap>
          {chips.map((chip) => (
            <Tag key={chip.key} color={severityColors[chip.key]} style={{ fontSize: 14 }}>
              {chip.label}: {chip.value}
            </Tag>
          ))}
          <Tag color="default" style={{ fontSize: 14 }}>
            Всего событий: {twin.eventsCount.total}
          </Tag>
        </Space>
        <Space align="center" size={16} wrap>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Typography.Text strong>Полнота карточки:</Typography.Text>
            <Progress percent={twin.completenessPct} size="small" strokeColor="#1677ff" />
          </span>
          <Space>
            <Button type="primary" onClick={onShowEvents}>
              Все события объекта
            </Button>
            <Button onClick={onShowGraph}>Показать на графе</Button>
          </Space>
        </Space>
      </Space>
    </div>
  );
};

export default TwinHeader;
