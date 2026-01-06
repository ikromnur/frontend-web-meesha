import PaymentStatusPage from "@/components/pages/landing-page/payment-status";

export const metadata = {
  title: "Status Pembayaran",
};

const PaymentStatus = ({ params }: { params: { id: string } }) => {
  return <PaymentStatusPage orderId={params.id} />;
};

export default PaymentStatus;