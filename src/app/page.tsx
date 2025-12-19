import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Handle auth code redirect for password reset flow
  const params = await searchParams;
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}&next=/reset-password`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 text-center overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-blue-50">
        {/* Decorative blurred blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000" />

        {/* Content */}
        <h1 className="relative z-10 text-5xl font-bold text-slate-900 mb-2">Duo</h1>
        <p className="relative z-10 text-xl text-slate-600 mb-4">Financial Harmony for Couples</p>
        <p className="relative z-10 text-lg text-slate-500 max-w-md mb-8">
          Managing money with your partner, made simple and stress-free.
        </p>
        <div className="relative z-10 flex flex-col sm:flex-row gap-4">
          <Button asChild className="bg-violet-600 hover:bg-violet-700 px-8">
            <Link href="/signup">Sign Up</Link>
          </Button>
          <Button asChild variant="outline" className="px-8">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Track Personal */}
            <div className="group flex flex-col items-center text-center p-6 rounded-xl bg-white border-t-4 border-blue-500 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <User className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Track Personal</h3>
              <p className="text-slate-500">Your spending stays yours</p>
            </div>

            {/* Share Joint */}
            <div className="group flex flex-col items-center text-center p-6 rounded-xl bg-white border-t-4 border-purple-500 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Share Joint</h3>
              <p className="text-slate-500">Mark shared expenses with a tap</p>
            </div>

            {/* Settle Monthly */}
            <div className="group flex flex-col items-center text-center p-6 rounded-xl bg-white border-t-4 border-emerald-500 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Settle Monthly</h3>
              <p className="text-slate-500">See who owes whom at month&apos;s end</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative px-4 py-20 text-center overflow-hidden bg-gradient-to-tl from-violet-50 via-slate-50 to-emerald-50">
        {/* Decorative blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />

        <p className="relative z-10 text-2xl font-medium text-slate-700 mb-6">Ready to get started?</p>
        <Button asChild className="relative z-10 bg-violet-600 hover:bg-violet-700 px-8 shadow-lg hover:shadow-xl transition-shadow">
          <Link href="/signup">Get Started</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center border-t border-slate-200">
        <p className="text-slate-500 text-sm">© 2025 Duo. Made with love.</p>
      </footer>
    </div>
  );
}
