import { Alert, Modal, Typography } from 'antd';
import { useState } from 'react';

const message =
  'Отсутствие события трактуется как «нет зарегистрированных отклонений», но не как подтверждение измеренного значения.';

const SemanticsBanner = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Alert
        className="info-banner"
        message="Семантика мониторинга"
        description={
          <span className="text-ellipsis" title={message}>
            {message}{' '}
            <Typography.Link onClick={() => setOpen(true)}>Подробнее</Typography.Link>
          </span>
        }
        type="info"
        showIcon
      />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={() => setOpen(false)} title="Семантика данных">
        <Typography.Paragraph>{message}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          В нормальном режиме фактические значения не поступают. События формируются только при
          отклонениях от плановых параметров или нарушениях полноты данных.
        </Typography.Paragraph>
      </Modal>
    </>
  );
};

export default SemanticsBanner;
