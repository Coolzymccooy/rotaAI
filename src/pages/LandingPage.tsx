import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, CalendarDays, Map as MapIcon, ShieldCheck, Zap, ArrowRight, Activity, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Stethoscope className="w-6 h-6" />
            <span>RotaAI</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
        <div className="absolute inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

        <div className="container mx-auto px-4 relative z-10 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              The Future of Clinical Workforce Management
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight"
            >
              Intelligent Rotas. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">
                Zero Violations.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed"
            >
              RotaAI uses advanced generative AI to automatically build EWTD-compliant medical schedules, optimize locum spend, and balance ward acuity in real-time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link
                to={user ? '/app' : '/register'}
                className="inline-flex items-center justify-center rounded-full text-base font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 w-full sm:w-auto group"
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full text-base font-medium transition-colors border border-input hover:bg-accent hover:text-accent-foreground h-12 px-8 w-full sm:w-auto"
              >
                Explore Features
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-secondary/30 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Everything you need to manage your clinical workforce</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Replace manual spreadsheets with an intelligent system that understands clinical constraints, staff preferences, and patient acuity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-amber-500" />}
              title="AI Rota Generation"
              description="Generate complete, compliant schedules in seconds using our advanced optimization engine. Just type a prompt and watch the magic happen."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6 text-emerald-500" />}
              title="EWTD Compliance"
              description="Never worry about European Working Time Directive violations again. The system automatically enforces rest periods and maximum hours."
            />
            <FeatureCard
              icon={<Activity className="w-6 h-6 text-blue-500" />}
              title="Live Acuity Map"
              description="Monitor patient load vs. staffing levels across all wards in real-time. Auto-balance staff to critical areas instantly."
            />
            <FeatureCard
              icon={<CalendarDays className="w-6 h-6 text-indigo-500" />}
              title="Drag & Drop Rota Board"
              description="An intuitive, drag-and-drop interface for managing shifts with Day/Week/Month calendar views and real-time validation."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-purple-500" />}
              title="Workforce Management"
              description="Track doctor fatigue, karma scores, shift swaps, and leave requests. Keep your team happy and prevent burnout."
            />
            <FeatureCard
              icon={<MapIcon className="w-6 h-6 text-rose-500" />}
              title="Locum Spend Optimization"
              description="Reduce reliance on expensive agency staff. RotaAI projects locum spend and actively suggests internal coverage alternatives."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-4 relative z-10 max-w-4xl text-center space-y-8">
          <h2 className="text-4xl font-bold tracking-tight">Ready to transform your hospital's scheduling?</h2>
          <p className="text-xl text-muted-foreground">
            Join the future of clinical workforce management today. Experience the power of AI-driven rotas.
          </p>
          <Link
            to={user ? '/app' : '/register'}
            className="inline-flex items-center justify-center rounded-full text-lg font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 shadow-lg shadow-primary/25"
          >
            {user ? 'Open RotaAI' : 'Start Free Trial'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-background">
        <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Stethoscope className="w-4 h-4" />
            <span>RotaAI</span>
          </div>
          <p>&copy; {new Date().getFullYear()} RotaAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
