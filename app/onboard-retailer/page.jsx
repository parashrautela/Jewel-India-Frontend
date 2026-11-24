import { OnboardLayout } from "../../components/onboard/OnboardLayout";
import { StepIndicator } from "../../components/onboard/StepIndicator";
import { RetailerStep1Container } from "../../components/onboard-retailer/step1/RetailerStep1Container";

export const metadata = { title: "Step 1 of 3 — Retailer Onboarding" };

export default function RetailerOnboardStep1Page() {
  return (
    <OnboardLayout
      heading="Let's get to know you"
      description="We need a few details to verify who you are. This keeps your account and your business safe."
      backRoute="/entry_page/signup"
    >
      <div className="flex flex-col w-full max-w-[500px] mx-auto md:mx-0 mt-8 md:mt-0">
        <StepIndicator currentStep={1} totalSteps={3} />
        <RetailerStep1Container />
      </div>
    </OnboardLayout>
  );
}