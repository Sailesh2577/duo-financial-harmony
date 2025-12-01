import { Suspense } from "react";
import SignupForm from "./signup-form";

function SignupSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto"></div>
      <div className="h-10 bg-slate-200 rounded"></div>
      <div className="h-10 bg-slate-200 rounded"></div>
      <div className="h-10 bg-slate-200 rounded"></div>
      <div className="h-10 bg-slate-200 rounded"></div>
      <div className="h-10 bg-slate-200 rounded"></div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}
