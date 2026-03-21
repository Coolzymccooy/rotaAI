import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserPlus, Mail, Copy, Trash2, Loader2, CheckCircle2, Clock, Users, Shield, Building2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';

export function Team() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const { addToast } = useToast();

  const [invites, setInvites] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('doctor');
  const [isSending, setIsSending] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invitesRes] = await Promise.all([
        authFetch('/api/auth/invites'),
      ]);
      const invitesData = await invitesRes.json();
      if (invitesData.success) setInvites(invitesData.data);
    } catch {}
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await authFetch('/api/auth/invites', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (data.success) {
        setLastInviteUrl(data.data.inviteUrl);
        addToast(`Invite sent to ${inviteEmail}`, 'success');
        setInviteEmail('');
        fetchData();
      } else {
        addToast(data.message || 'Failed to send invite', 'error');
      }
    } catch { addToast('Failed to send invite', 'error'); }
    finally { setIsSending(false); }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      const res = await authFetch(`/api/auth/invites/${id}`, { method: 'DELETE' });
      if ((await res.json()).success) {
        addToast('Invite revoked', 'success');
        fetchData();
      }
    } catch { addToast('Failed to revoke', 'error'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 'success');
  };

  const pendingInvites = invites.filter(i => !i.acceptedAt && new Date(i.expiresAt) > new Date());
  const acceptedInvites = invites.filter(i => i.acceptedAt);
  const expiredInvites = invites.filter(i => !i.acceptedAt && new Date(i.expiresAt) <= new Date());

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">Manage members and invitations for your organization.</p>
        </div>
        <Button onClick={() => { setIsInviteModalOpen(true); setLastInviteUrl(''); }}>
          <UserPlus className="w-4 h-4 mr-2" />Invite Member
        </Button>
      </div>

      {/* Org info */}
      {(user as any)?.organization && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{(user as any).organization.name}</h3>
              <p className="text-sm text-muted-foreground">
                {pendingInvites.length} pending invite(s) &bull; {acceptedInvites.length} joined
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Pending Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending invitations. Click "Invite Member" to add team members.</p>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>{invite.role}</Badge>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/register?invite=${invite.token}`)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" title="Copy invite link">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRevokeInvite(invite.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" title="Revoke">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted / Joined */}
      {acceptedInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" />Joined Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acceptedInvites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">Joined {new Date(invite.acceptedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>{invite.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleSendInvite} className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Send an invite link to add someone to your organization. They'll create their own password when they sign up.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm"
              placeholder="colleague@nhs.net" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm">
              <option value="doctor">Doctor (can view own shifts, request swaps)</option>
              <option value="admin">Admin (full access, manage rotas and staff)</option>
            </select>
          </div>

          {lastInviteUrl && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">Invite link created! Share this with them:</p>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={lastInviteUrl}
                  className="flex-1 h-8 px-2 rounded bg-secondary text-xs font-mono text-foreground border border-border" />
                <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(lastInviteUrl)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>Close</Button>
            <Button type="submit" disabled={isSending}>
              {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Mail className="w-4 h-4 mr-2" />Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
