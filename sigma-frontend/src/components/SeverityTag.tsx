import { Tag } from 'antd';
import { Severity } from '../types';
import { severityColors, severityTitles } from '../utils';

interface SeverityTagProps {
  severity: Severity;
}

const SeverityTag = ({ severity }: SeverityTagProps) => (
  <Tag color={severityColors[severity]}>{severityTitles[severity]}</Tag>
);

export default SeverityTag;
