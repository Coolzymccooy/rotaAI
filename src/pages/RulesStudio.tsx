import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldAlert, SlidersHorizontal, Activity, TrendingUp, AlertTriangle, PlayCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuthFetch, useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function RulesStudio() {
  const { addToast } = useToast();
  const authFetch = useAuthFetch();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'constraints' | 'warroom'>('constraints');
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fairnessWeight, setFairnessWeight] = useState(70);
  const [costWeight, setCostWeight] = useState(60);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<any>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const fetchRules = async () => {
    try {
      const response = await authFetch('/api/rules');
      const data = await response.json();
      if (data.success) setRules(data.data);
    } catch (error) {
      addToast('Failed to load rules', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const toggleRule = async (id: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      const response = await authFetch(`/api/rules/${id}`, {
        method: 'PUT', body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setRules(rules.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)));
        addToast(`Rule "${data.data.name}" ${!currentStatus ? 'enabled' : 'disabled'}`, !currentStatus ? 'success' : 'info');
      }
    } catch { addToast('Failed to update rule', 'error'); }
  };

  // Compliance audit - checks shifts against active rules
  const runAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const [shiftsRes, docsRes] = await Promise.all([
        authFetch('/api/shifts'),
        authFetch('/api/doctors'),
      ]);
      const shifts = (await shiftsRes.json()).data || [];
      const doctors = (await docsRes.json()).data || [];
      const activeRules = rules.filter(r => r.isActive);

      const violations: string[] = [];
      const passed: string[] = [];

      // Check max weekly hours
      const maxHoursRule = activeRules.find(r => r.name.toLowerCase().includes('max weekly'));
      if (maxHoursRule) {
        const hoursPerDoc: Record<string, number> = {};
        shifts.forEach((s: any) => { hoursPerDoc[s.doctorId] = (hoursPerDoc[s.doctorId] || 0) + 12; });
        const overworked = Object.entries(hoursPerDoc).filter(([, h]) => h > 48);
        if (overworked.length > 0) {
          const names = overworked.map(([id]) => doctors.find((d: any) => d.id === id)?.name || id);
          violations.push(`Max Weekly Hours: ${names.join(', ')} exceed 48h limit`);
        } else {
          passed.push('Max Weekly Hours: All doctors within 48h limit');
        }
      }

      // Check skill mix
      const skillRule = activeRules.find(r => r.name.toLowerCase().includes('skill mix'));
      if (skillRule) {
        for (let day = 0; day < 7; day++) {
          const dayShifts = shifts.filter((s: any) => s.dayIdx === day);
          const docIds = dayShifts.map((s: any) => s.doctorId);
          const dayDocs = doctors.filter((d: any) => docIds.includes(d.id));
          const hasConsultant = dayDocs.some((d: any) => d.grade === 'Consultant');
          if (!hasConsultant && dayShifts.length > 0) {
            violations.push(`Skill Mix: Day ${day} has no Consultant on shift`);
          }
        }
        if (!violations.some(v => v.includes('Skill Mix'))) {
          passed.push('Skill Mix: Consultant coverage on all active days');
        }
      }

      // Check violations flag
      const violationShifts = shifts.filter((s: any) => s.violation);
      if (violationShifts.length > 0) {
        violations.push(`${violationShifts.length} shift(s) flagged with violations`);
      }

      activeRules.forEach(r => {
        if (!violations.some(v => v.toLowerCase().includes(r.name.toLowerCase())) &&
            !passed.some(p => p.toLowerCase().includes(r.name.toLowerCase()))) {
          passed.push(`${r.name}: Compliant`);
        }
      });

      setAuditResult({ violations, passed, totalShifts: shifts.length, totalDoctors: doctors.length });
      addToast(`Audit complete: ${violations.length} issues found`, violations.length > 0 ? 'error' : 'success');
    } catch {
      addToast('Audit failed', 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  // Scenario simulation
  const runScenario = async (name: string, config: { loadMultiplier: number; staffReduction: number }) => {
    setSimulating(name);
    setSimResults(null);
    try {
      const [docsRes, shiftsRes] = await Promise.all([
        authFetch('/api/doctors'),
        authFetch('/api/shifts'),
      ]);
      const doctors = (await docsRes.json()).data || [];
      const shifts = (await shiftsRes.json()).data || [];

      const currentStaff = doctors.filter((d: any) => d.status === 'Active').length;
      const adjustedStaff = Math.ceil(currentStaff * (1 - config.staffReduction));
      const adjustedLoad = Math.ceil(100 * config.loadMultiplier);

      const locumNeeded = Math.max(0, currentStaff - adjustedStaff);
      const locumCost = locumNeeded * 12 * 80 * 5; // 5 days, 12h, £80/h
      const burnoutCount = Math.ceil(adjustedStaff * config.loadMultiplier * 0.3);
      const coverage = Math.max(60, Math.min(100, Math.round((adjustedStaff / currentStaff) * 100 * (1 / config.loadMultiplier))));

      setSimResults({
        scenario: name,
        locumSpend: locumCost,
        burnoutRisk: burnoutCount > 5 ? 'High' : burnoutCount > 2 ? 'Medium' : 'Low',
        burnoutCount,
        coverage,
        staffAvailable: adjustedStaff,
        recommendations: [
          locumNeeded > 0 ? `Pre-book ${locumNeeded} bank staff to avoid agency premiums.` : null,
          config.loadMultiplier > 1.1 ? `Consider temporarily relaxing Night Shift Limit rule to reduce locum dependency.` : null,
          coverage < 90 ? `Activate mutual aid with neighbouring trusts for critical cover.` : null,
        ].filter(Boolean),
      });
      addToast(`Simulation "${name}" complete.`, 'success');
    } catch {
      addToast('Simulation failed', 'error');
    } finally {
      setSimulating(null);
    }
  };

  const handleApplyRecommendations = async () => {
    addToast('Generating optimized rota with scenario adjustments...', 'info');
    try {
      const res = await authFetch('/api/rota/generate', {
        method: 'POST',
        body: JSON.stringify({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          rules: { fairnessWeight, costWeight },
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Rota regenerated with recommendations applied!', 'success');
        window.dispatchEvent(new Event('rota-updated'));
        navigate('/app/rota');
      }
    } catch {
      addToast('Failed to apply recommendations', 'error');
    }
  };

  const scenarios = [
    { name: 'Winter Flu Spike', icon: TrendingUp, color: 'text-amber-500', desc: '+20% load, +15% sickness', config: { loadMultiplier: 1.2, staffReduction: 0.15 } },
    { name: 'Junior Doctor Strike', icon: AlertTriangle, color: 'text-destructive', desc: '-80% SHO/Reg (3 days)', config: { loadMultiplier: 1.0, staffReduction: 0.5 } },
    { name: 'Budget Cut (-10%)', icon: Activity, color: 'text-emerald-500', desc: 'Strict locum cap', config: { loadMultiplier: 1.0, staffReduction: 0.1 } },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rules Studio & War Room</h1>
          <p className="text-muted-foreground mt-1">Configure constraints and run predictive scenarios.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-secondary p-1 rounded-lg flex items-center">
            <button onClick={() => setActiveTab('constraints')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'constraints' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Constraints</button>
            <button onClick={() => setActiveTab('warroom')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'warroom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>War Room</button>
          </div>
        </div>
      </div>

      {activeTab === 'constraints' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : rules.map((rule) => (
              <Card key={rule.id} className={`transition-all ${rule.isActive ? 'border-l-4 border-l-primary' : 'opacity-60'}`}>
                <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{rule.name}</h3>
                      <Badge variant={rule.severity === 'Hard' ? 'destructive' : 'secondary'}>{rule.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Value</span>
                      <span className="font-mono font-medium">{rule.value}</span>
                    </div>
                    {isAdmin && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={rule.isActive} onChange={() => toggleRule(rule.id, rule.isActive)} />
                        <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-primary" />Optimization Weights</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="font-medium">Fairness</span><span className="text-muted-foreground">{fairnessWeight}%</span></div>
                  <input type="range" className="w-full accent-primary" value={fairnessWeight} onChange={(e) => setFairnessWeight(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Used when generating rotas via Auto-Optimize.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="font-medium">Cost vs Coverage</span><span className="text-muted-foreground">{costWeight}%</span></div>
                  <input type="range" className="w-full accent-primary" value={costWeight} onChange={(e) => setCostWeight(Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><ShieldAlert className="w-5 h-5" />Compliance Audit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {auditResult ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">{auditResult.totalShifts} shifts</span> across <span className="font-medium">{auditResult.totalDoctors} doctors</span>
                    </div>
                    {auditResult.passed.map((p: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />{p}
                      </div>
                    ))}
                    {auditResult.violations.map((v: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                        <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{v}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Run an audit to check your rota against all active rules.</p>
                )}
                <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/10" onClick={runAudit} disabled={isAuditing}>
                  {isAuditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                  {auditResult ? 'Re-run Audit' : 'Run Audit'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Scenario Library</h3>
            {scenarios.map((s) => (
              <Card key={s.name} className="cursor-pointer hover:border-primary transition-colors" onClick={() => runScenario(s.name, s.config)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2"><s.icon className={`w-4 h-4 ${s.color}`} />{s.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                  <PlayCircle className={`w-8 h-8 ${simulating === s.name ? 'text-primary animate-pulse' : 'text-muted-foreground/30'}`} />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border bg-secondary/30">
                <CardTitle>Projected Impact</CardTitle>
                <p className="text-sm text-muted-foreground">{simResults ? `Scenario: ${simResults.scenario}` : 'Select a scenario to run'}</p>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-center">
                {simulating ? (
                  <div className="text-center space-y-4"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-muted-foreground animate-pulse">Running simulation against real workforce data...</p></div>
                ) : simResults ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="text-sm font-medium text-destructive mb-1">Locum Spend</div>
                        <div className="text-3xl font-bold text-destructive">+&pound;{(simResults.locumSpend / 1000).toFixed(0)}k</div>
                      </div>
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Burnout Risk</div>
                        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{simResults.burnoutRisk}</div>
                        <div className="text-xs text-amber-600/80 dark:text-amber-400/80">{simResults.burnoutCount} staff affected</div>
                      </div>
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Coverage</div>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{simResults.coverage}%</div>
                      </div>
                    </div>
                    {simResults.recommendations.length > 0 && (
                      <div className="text-left space-y-4">
                        <h4 className="font-semibold border-b border-border pb-2">AI Recommendations</h4>
                        <ul className="space-y-3 text-sm">
                          {simResults.recommendations.map((r: string, i: number) => (
                            <li key={i} className="flex gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">{i + 1}</div>
                              <p>{r}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button className="w-full" onClick={handleApplyRecommendations}>Apply Recommendations to Rota</Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Select a scenario from the library to see projected impact on your workforce.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
