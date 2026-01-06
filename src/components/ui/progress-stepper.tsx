import { cn } from "@/lib/utils";
import React from "react";
import { FaShoppingCart, FaCreditCard } from "react-icons/fa";
import { HiOutlineReceiptRefund } from "react-icons/hi";

interface ProgressStepperProps {
  currentStep: number;
  className?: string;
}

const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  className,
}) => {
  const steps = [
    {
      id: 1,
      name: "Keranjang",
      icon: <FaShoppingCart />,
    },
    {
      id: 2,
      name: "Checkout",
      icon: <HiOutlineReceiptRefund />,
    },
    {
      id: 3,
      name: "Pembayaran",
      icon: <FaCreditCard />,
    },
  ];

  return (
    <div className={cn("w-full px-4 py-5 max-w-screen-md mx-auto", className)}>
      <div className="relative flex flex-row items-center justify-between gap-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center z-10">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.id
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`mt-2 text-sm font-medium ${
                  currentStep >= step.id ? "text-primary" : "text-gray-600"
                }`}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-1 flex-1 ${
                  currentStep > step.id ? "bg-primary" : "bg-gray-200"
                }`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressStepper;
