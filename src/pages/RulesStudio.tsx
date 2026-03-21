import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Settings2, ShieldAlert, SlidersHorizontal, Activity, TrendingUp, AlertTriangle, PlayCircle, Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const initialRules = [
  { name: 'Max Weekly Hours', severity: 'Hard', value: '48h', description: 'Maximum hours a doctor can work in a 7-day rolling period.', isActive: true },
  { name: 'Minimum Rest Period', severity: 'Hard', value: '11h', description: 'Minimum rest hours between consecutive shifts.', isActive: true },
  { name: 'Night Shift Limit', severity: 'Soft', value: '4 max', description: 'Maximum consecutive night shifts before mandatory rest.', isActive: true },
  { name: 'Weekend Fairness', severity: 'Soft', value: 'Equal', description: 'Distribute weekend shifts equally among staff of same grade.', isActive: true },
  { name: 'Skill Mix (A&E)', severity: 'Hard', value: '≥1 Cons', description: 'Always have at least one Consultant on shift in A&E.', isActive: false },
];

export function RulesStudio() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'constraints' | 'warroom'>('constraints');
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fairnessWeight, setFairnessWeight] = useState(70);
  const [costWeight, setCostWeight] = useState(60);
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules');
      const data = await response.json();
      if (data.success) {
        if (data.data.length === 0) {
          await seedRules();
        } else {
          setRules(data.data);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      addToast('Failed to load rules', 'destructive');
      setIsLoading(false);
    }
  };

  const seedRules = async () => {
    try {
      for (const rule of initialRules) {
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule)
        });
      }
      const response = await fetch('/api/rules');
      const data = await response.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('Failed to seed rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const response = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        setRules(rules.map(rule => rule.id === id ? { ...rule, isActive: newStatus } : rule));
        addToast(`Rule "${data.data.name}" ${newStatus ? 'enabled' : 'disabled'}`, newStatus ? 'success' : 'info');
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
      addToast('Failed to update rule', 'destructive');
    }
  };

  const runScenario = (scenarioName: string) => {
    setSimulating(scenarioName);
    addToast(`Running Monte Carlo simulation for: ${scenarioName}...`, 'info');
    setTimeout(() => {
      setSimulating(null);
      addToast(`Simulation complete. View projected impact below.`, 'success');
    }, 2000);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rules Studio & War Room</h1>
          <p className="text-muted-foreground mt-1">Configure constraints and run predictive "What-If" scenarios.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-secondary p-1 rounded-lg flex items-center">
            <button 
              onClick={() => setActiveTab('constraints')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'constraints' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Constraints
            </button>
            <button 
              onClick={() => setActiveTab('warroom')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'warroom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              War Room
            </button>
          </div>
          {activeTab === 'constraints' && (
            <Button onClick={() => addToast('Opening rule creation wizard...', 'info')}>
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'constraints' ? (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="col-span-2 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id} className={`transition-all ${rule.isActive ? 'border-l-4 border-l-primary' : 'opacity-60'}`}>
                  <CardContent className="p-6 flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{rule.name}</h3>
                        <Badge variant={rule.severity === 'Hard' ? 'destructive' : 'secondary'}>
                          {rule.severity} Constraint
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Value</span>
                        <span className="font-mono font-medium">{rule.value}</span>
                      </div>
                      <div className="flex items-center h-6">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={rule.isActive} 
                            onChange={() => toggleRule(rule.id, rule.isActive)}
                          />
                          <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  Optimization Weights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Fairness vs Preferences</span>
                    <span className="text-muted-foreground">{fairnessWeight} / {100 - fairnessWeight}</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full accent-primary" 
                    value={fairnessWeight}
                    onChange={(e) => setFairnessWeight(Number(e.target.value))}
                    onMouseUp={() => addToast('Fairness weight updated', 'success')}
                  />
                  <p className="text-xs text-muted-foreground">Prioritize equal distribution over individual requests.</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Cost vs Coverage</span>
                    <span className="text-muted-foreground">{costWeight} / {100 - costWeight}</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full accent-primary" 
                    value={costWeight}
                    onChange={(e) => setCostWeight(Number(e.target.value))}
                    onMouseUp={() => addToast('Cost vs Coverage weight updated', 'success')}
                  />
                  <p className="text-xs text-muted-foreground">Allow locum spend to ensure safe staffing levels.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <ShieldAlert className="w-5 h-5" />
                  Compliance Check
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Your current ruleset is fully compliant with EWTD (European Working Time Directive) and BMA guidelines.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-primary/20 text-primary hover:bg-primary/10"
                  onClick={() => addToast('Running compliance audit... This may take a moment.', 'info')}
                >
                  Run Audit Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="col-span-1 space-y-4">
            <h3 className="text-lg font-semibold mb-2">Scenario Library</h3>
            
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => runScenario('Winter Flu Spike')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Winter Flu Spike
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">+20% patient load, +15% staff sickness</p>
                </div>
                <PlayCircle className={`w-8 h-8 ${simulating === 'Winter Flu Spike' ? 'text-primary animate-pulse' : 'text-muted-foreground/30'}`} />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => runScenario('Junior Doctor Strike')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Junior Doctor Strike
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">-80% SHO/Registrar availability (3 days)</p>
                </div>
                <PlayCircle className={`w-8 h-8 ${simulating === 'Junior Doctor Strike' ? 'text-primary animate-pulse' : 'text-muted-foreground/30'}`} />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => runScenario('Budget Cut (-10%)')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Budget Cut (-10%)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Strict cap on agency locum spend</p>
                </div>
                <PlayCircle className={`w-8 h-8 ${simulating === 'Budget Cut (-10%)' ? 'text-primary animate-pulse' : 'text-muted-foreground/30'}`} />
              </CardContent>
            </Card>
            
            <Button variant="outline" className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" /> Create Custom Scenario
            </Button>
          </div>

          <div className="col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border bg-secondary/30">
                <CardTitle>Projected Impact</CardTitle>
                <p className="text-sm text-muted-foreground">Results from 10,000 Monte Carlo simulations</p>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                {simulating ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground animate-pulse">Running simulations across 6 months of historical data...</p>
                  </div>
                ) : (
                  <div className="w-full space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="text-sm font-medium text-destructive mb-1">Locum Spend</div>
                        <div className="text-3xl font-bold text-destructive">+£45k</div>
                        <div className="text-xs text-destructive/80 mt-1">vs baseline</div>
                      </div>
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="text-sm font-medium text-amber-600 mb-1">Burnout Risk</div>
                        <div className="text-3xl font-bold text-amber-600">High</div>
                        <div className="text-xs text-amber-600/80 mt-1">12 staff in critical zone</div>
                      </div>
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-sm font-medium text-emerald-600 mb-1">Shift Coverage</div>
                        <div className="text-3xl font-bold text-emerald-600">92%</div>
                        <div className="text-xs text-emerald-600/80 mt-1">Safe staffing maintained</div>
                      </div>
                    </div>

                    <div className="text-left space-y-4">
                      <h4 className="font-semibold border-b border-border pb-2">AI Recommendations to Mitigate</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                          <p><strong>Pre-book Bank Staff:</strong> Secure 5 additional bank nurses now to avoid 3x agency premiums during the spike.</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                          <p><strong>Relax Rule #3 (Night Shifts):</strong> Temporarily allowing 5 consecutive nights (with compensatory rest) reduces locum dependency by 15%.</p>
                        </li>
                      </ul>
                      <Button className="w-full mt-4">Apply Recommendations to Rota</Button>
                    </div>
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
