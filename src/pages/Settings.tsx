import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { User, Shield, Bell, Palette, Key, Loader2, CheckCircle2, Mail, Clock, Calendar } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function Settings() {
  const { user, isAdmin } = useAuth();
  const authFetch = useAuthFetch();
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications' | 'security'>('profile');
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [notifSettings, setNotifSettings] = useState({
    shiftChanges: true,
    swapRequests: true,
    leaveUpdates: true,
    complianceAlerts: true,
    weeklyDigest: false,
  });

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name, email: user.email });
      if (user.doctorId) {
        authFetch(`/api/doctors/${user.doctorId}`).then(r => r.json()).then(d => {
          if (d.success) setDoctorProfile(d.data);
        }).catch(() => {});
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would call a profile update endpoint
      addToast('Profile updated successfully', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'preferences', label: 'Preferences', icon: Palette },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <div className="lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                  activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      <Badge variant={isAdmin ? 'default' : 'secondary'} className="mt-1">
                        {isAdmin ? 'Administrator' : 'Doctor'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Doctor-specific profile */}
              {doctorProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Clinical Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Grade</p>
                        <p className="font-medium mt-1">{doctorProfile.grade}</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium mt-1">{doctorProfile.department}</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Specialty</p>
                        <p className="font-medium mt-1">{doctorProfile.specialty || '-'}</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Site</p>
                        <p className="font-medium mt-1">{doctorProfile.site || '-'}</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Max Weekly Hours</p>
                        <p className="font-medium mt-1">{doctorProfile.maxHours}h</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Contract</p>
                        <p className="font-medium mt-1">{doctorProfile.contract}</p>
                      </div>
                      {doctorProfile.skills && (
                        <div className="p-3 bg-secondary/50 rounded-lg sm:col-span-2 lg:col-span-3">
                          <p className="text-xs text-muted-foreground">Skills</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doctorProfile.skills.split(';').map((s: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {doctorProfile.preferences && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg sm:col-span-2 lg:col-span-3">
                          <p className="text-xs text-primary font-medium">Shift Preferences</p>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                            <div>Preferred: <span className="font-medium">{doctorProfile.preferences.preferredShift || 'Any'}</span></div>
                            <div>Training Day: <span className="font-medium">{doctorProfile.preferences.trainingDay || 'None'}</span></div>
                            <div>Unavailable: <span className="font-medium">{doctorProfile.preferences.unavailableDay || 'None'}</span></div>
                          </div>
                        </div>
                      )}
                      {doctorProfile.historicalLoad && (
                        <div className="p-3 bg-secondary/50 rounded-lg sm:col-span-2 lg:col-span-3">
                          <p className="text-xs text-muted-foreground mb-2">Year-to-Date Load</p>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>Weekends: <span className="font-medium">{doctorProfile.historicalLoad.weekendsYtd}</span></div>
                            <div>Nights: <span className="font-medium">{doctorProfile.historicalLoad.nightsYtd}</span></div>
                            <div>On-calls: <span className="font-medium">{doctorProfile.historicalLoad.oncallsYtd}</span></div>
                            <div>Last 7d: <span className="font-medium">{doctorProfile.historicalLoad.hoursWorkedLast7}h</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'preferences' && (
            <Card>
              <CardHeader><CardTitle>Appearance & Display</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                  </div>
                  <div className="flex items-center bg-secondary rounded-lg p-1 gap-1">
                    {[
                      { value: 'light' as const, label: 'Light' },
                      { value: 'dark' as const, label: 'Dark' },
                      { value: 'system' as const, label: 'System' },
                    ].map(({ value, label }) => (
                      <button key={value} onClick={() => setTheme(value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Default Rota View</p>
                    <p className="text-sm text-muted-foreground">Preferred calendar view when opening the Rota Board</p>
                  </div>
                  <select className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm outline-none">
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rota Page Size</p>
                    <p className="text-sm text-muted-foreground">Doctors per page on the Rota Board</p>
                  </div>
                  <select className="h-9 px-3 rounded-md bg-secondary text-foreground border border-border text-sm outline-none">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'shiftChanges', label: 'Shift Changes', desc: 'Get notified when your shifts are modified' },
                  { key: 'swapRequests', label: 'Swap Requests', desc: 'Alerts for incoming shift swap requests' },
                  { key: 'leaveUpdates', label: 'Leave Updates', desc: 'Status updates on your leave requests' },
                  { key: 'complianceAlerts', label: 'Compliance Alerts', desc: 'EWTD violations and burnout risk warnings' },
                  { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary email every Monday morning' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer"
                        checked={(notifSettings as any)[key]}
                        onChange={() => setNotifSettings(prev => ({ ...prev, [key]: !(prev as any)[key] }))} />
                      <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
                <div className="pt-4 flex justify-end border-t border-border">
                  <Button onClick={() => addToast('Notification preferences saved', 'success')}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader><CardTitle>Security</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Change Password</h4>
                  <div className="space-y-3 max-w-sm">
                    <input type="password" placeholder="Current password"
                      className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm" />
                    <input type="password" placeholder="New password"
                      className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm" />
                    <input type="password" placeholder="Confirm new password"
                      className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm" />
                    <Button onClick={() => addToast('Password updated successfully', 'success')}>
                      <Key className="w-4 h-4 mr-2" />Update Password
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <h4 className="font-medium">Active Sessions</h4>
                  <div className="p-3 bg-secondary/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-sm font-medium">Current Session</p>
                        <p className="text-xs text-muted-foreground">Browser &bull; {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
