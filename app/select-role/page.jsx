import { getAuthUser } from "../../lib/supabase/queries";
import { redirect } from "next/navigation";
import { SelectRoleForm } from "../../components/auth/SelectRoleForm";

export const metadata = {
  title: "Choose Your Role — Celestique",
  description: "Tell us whether you're a wholesaler, a retailer or store staff to personalise your experience.",
};
export default async function SelectRolePage() {
  // getAuthUser() is deduplicated by React.cache() — one /user call for the
  // entire render, shared with the root layout.
  const user = await getAuthUser();

  if (!user) redirect("/signin");

  const existingRole = user.user_metadata?.role;
  if (existingRole === "wholesaler") redirect("/dashboard/wholesaler");
  if (existingRole === "retailer") redirect("/");
  if (existingRole === "employee") redirect("/dashboard/employee");

  return (
    <div className="min-h-screen flex items-center justify-center bg-celestique-cream px-4">
      <div className="w-full max-w-md">

        {/* Decorative gem icon */}
        <div className="flex justify-center mb-12">
          <div className="w-16 h-16 border border-celestique-dark flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-celestique-dark" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
            </svg>
          </div>
        </div>

        <div className="bg-celestique-cream border border-celestique-taupe">
          <div className="border-b border-celestique-taupe px-8 py-10 text-center">
            <h1 className="font-serif text-3xl text-celestique-dark">
              How will you use Celestique?
            </h1>
            <p className="text-celestique-dark/60 text-[10px] uppercase tracking-[0.2em] mt-4 leading-relaxed">
              Choose the door you&apos;re coming through.<br />
              <span className="text-celestique-dark/40 text-[9px] tracking-[0.1em]">This cannot be changed later.</span>
            </p>
          </div>

          <div className="p-8">
            <SelectRoleForm />
          </div>
        </div>

        <p className="text-center text-[9px] uppercase tracking-[0.2em] text-celestique-dark/40 mt-8">
          Signed in as <span className="text-celestique-dark/60">{user.email}</span>
        </p>
      </div>
    </div>
  );
}
