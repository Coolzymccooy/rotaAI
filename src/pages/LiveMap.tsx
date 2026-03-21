import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Activity, AlertTriangle, Users, Map as MapIcon, ArrowRightLeft, Stethoscope } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const wards = [
  { id: 'ae', name: 'A&E Resus', patients: 45, capacity: 40, staff: 4, required: 6, status: 'critical' },
  { id: 'icu', name: 'Intensive Care', patients: 12, capacity: 15, staff: 5, required: 5, status: 'stable' },
  { id: 'ward1', name: 'Acute Medical', patients: 28, capacity: 30, staff: 3, required: 3, status: 'stable' },
  { id: 'ward2', name: 'Surgical', patients: 15, capacity: 25, staff: 4, required: 2, status: 'overstaffed' },
];

export function LiveMap() {
  const { addToast } = useToast();
  const [activeWards, setActiveWards] = useState(wards);

  const handleReassign = () => {
    addToast('AI Reassigning: Moving 1 Doctor from Surgical to A&E Resus...', 'info');
    setTimeout(() => {
      setActiveWards(prev => prev.map(w => {
        if (w.id === 'ae') return { ...w, staff: 5, status: 'warning' };
        if (w.id === 'ward2') return { ...w, staff: 3, status: 'stable' };
        return w;
      }));
      addToast('Reassignment complete. A&E Resus is now stabilizing.', 'success');
    }, 1500);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Acuity Map</h1>
          <p className="text-muted-foreground mt-1">Real-time patient load vs. staffing levels across the hospital.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => addToast('Syncing with Epic EHR...', 'info')}>
            <Activity className="w-4 h-4 mr-2" />
            Sync EHR
          </Button>
          <Button onClick={handleReassign} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Auto-Balance Staff
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {activeWards.map((ward) => (
          <Card 
            key={ward.id} 
            className={`transition-all ${
              ward.status === 'critical' ? 'border-destructive/50 bg-destructive/5' :
              ward.status === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
              ward.status === 'overstaffed' ? 'border-indigo-500/50 bg-indigo-500/5' :
              'border-emerald-500/20 bg-emerald-500/5'
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">{ward.name}</CardTitle>
                {ward.status === 'critical' && <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />}
                {ward.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {ward.status === 'stable' && <Activity className="w-5 h-5 text-emerald-500" />}
                {ward.status === 'overstaffed' && <Users className="w-5 h-5 text-indigo-500" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Patient Load</span>
                    <span className={`font-medium ${ward.patients > ward.capacity ? 'text-destructive' : ''}`}>
                      {ward.patients} / {ward.capacity}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${ward.patients > ward.capacity ? 'bg-destructive' : 'bg-primary'}`} 
                      style={{ width: `${Math.min((ward.patients / ward.capacity) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{ward.staff} Doctors</span>
                  </div>
                  <Badge variant={
                    ward.staff < ward.required ? 'destructive' :
                    ward.staff > ward.required ? 'secondary' : 'success'
                  }>
                    {ward.staff < ward.required ? `Need +${ward.required - ward.staff}` :
                     ward.staff > ward.required ? `Surplus +${ward.staff - ward.required}` : 'Optimal'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 min-h-[400px] relative overflow-hidden bg-secondary/20 border-border/50 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="text-center space-y-4 relative z-10">
          <MapIcon className="w-16 h-16 text-muted-foreground/50 mx-auto" />
          <h3 className="text-xl font-medium text-muted-foreground">Interactive 3D Floorplan</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The spatial view is currently rendering. Once loaded, you can drag and drop staff avatars between wards to instantly recalculate compliance and fatigue risk.
          </p>
          <Button variant="outline" onClick={() => addToast('Loading 3D WebGL context...', 'info')}>
            Force Render Map
          </Button>
        </div>
      </Card>
    </div>
  );
}
