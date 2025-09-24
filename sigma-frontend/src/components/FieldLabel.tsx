import { Typography } from 'antd';

interface FieldLabelProps {
  label: string;
  hint?: string;
}

const FieldLabel = ({ label, hint }: FieldLabelProps) => (
  <div>
    <Typography.Text strong>{label}</Typography.Text>
    {hint ? (
      <Typography.Text style={{ marginLeft: 8 }} type="secondary">
        {hint}
      </Typography.Text>
    ) : null}
  </div>
);

export default FieldLabel;
