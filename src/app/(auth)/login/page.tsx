import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-48 mx-auto mb-6" />
      <div className="space-y-4">
        <div>
          <div className="h-4 bg-slate-200 rounded w-16 mb-2" />
          <div className="h-10 bg-slate-200 rounded" />
        </div>
        <div>
          <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
          <div className="h-10 bg-slate-200 rounded" />
        </div>
        <div className="h-10 bg-slate-200 rounded" />
      </div>
    </div>
  );
}
