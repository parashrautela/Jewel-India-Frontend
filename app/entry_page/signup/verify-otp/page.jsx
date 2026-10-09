import { Suspense } from "react";
import { AuthLayout } from "../../../../components/auth/AuthLayout";
import { OtpForm } from "../../../../components/auth/OtpForm";

export const metadata = {
  title: "Verify OTP — Celestique",
};

// The heading names the door the person chose; someone who came in through
// "Sign in" without an account picks one after this step.
const HEADINGS = {
  wholesaler: ["Create a", "Wholesaler Account"],
  retailer: ["Create a", "Retailer Account"],
};

export default async function VerifyOtpPage({ searchParams }) {
  const { role } = await searchParams;
  const [lead, name] = HEADINGS[role] || ["Create", "your account"];

  return (
    <AuthLayout
      title={<><span className="text-[28px] sm:text-[32px] md:text-[44px]">{lead}</span><br/><span className="text-[28px] sm:text-[32px] md:text-[44px]">{name}</span></>}
      subtitle={null}
      imageSrc="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1774883373/authImg_ivftu7.png"
    >
      <Suspense>
        <OtpForm />
      </Suspense>
    </AuthLayout>
  );
}
