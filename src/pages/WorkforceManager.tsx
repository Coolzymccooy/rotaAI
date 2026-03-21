import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Download, Filter, MoreHorizontal, Plus, Search, Award, Star, Flame, Loader2, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

const initialStaff = [
  { id: 'DOC-001', name: 'Dr. Sarah Smith', role: 'Consultant', department: 'A&E', fte: '1.0', status: 'Active', karma: 2450, fatigue: 'Low' },
  { id: 'DOC-002', name: 'Dr. James Wilson', role: 'Registrar', department: 'A&E', fte: '0.8', status: 'On Leave', karma: 1820, fatigue: 'Medium' },
  { id: 'DOC-003', name: 'Dr. Emily Chen', role: 'SHO', department: 'A&E', fte: '1.0', status: 'Active', karma: 3100, fatigue: 'High' },
  { id: 'DOC-004', name: 'Dr. Michael Brown', role: 'Consultant', department: 'ICU', fte: '1.0', status: 'Active', karma: 950, fatigue: 'Low' },
  { id: 'DOC-005', name: 'Dr. Lisa Taylor', role: 'Registrar', department: 'ICU', fte: '0.6', status: 'Active', karma: 4200, fatigue: 'Critical' },
  { id: 'DOC-006', name: 'Dr. David Kim', role: 'FY2', department: 'A&E', fte: '1.0', status: 'Training', karma: 1100, fatigue: 'Low' },
];

export function WorkforceManager() {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    grade: 'Registrar',
    department: 'A&E',
    contract: '100%',
    fte: '1.0',
    status: 'Active',
    maxHours: 48
  });

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/doctors');
      const data = await response.json();
      if (data.success) {
        if (data.data.length === 0) {
          // Seed the database if empty
          await seedDatabase();
        } else {
          setStaff(data.data);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      addToast('Failed to load workforce data', 'destructive');
      setIsLoading(false);
    }
  };

  const seedDatabase = async () => {
    try {
      for (const person of initialStaff) {
        await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: person.name,
            grade: person.role,
            department: person.department,
            contract: person.fte === '1.0' ? '100%' : 'Part-time',
            fte: person.fte,
            status: person.status,
            karma: person.karma,
            fatigue: person.fatigue,
          })
        });
      }
      // Fetch again after seeding
      const response = await fetch('/api/doctors');
      const data = await response.json();
      if (data.success) {
        setStaff(data.data);
      }
    } catch (error) {
      console.error('Failed to seed database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);
  
  const handleOpenModal = (person?: any) => {
    if (person) {
      setEditingStaff(person);
      setFormData({
        name: person.name,
        grade: person.grade || 'Registrar',
        department: person.department || 'A&E',
        contract: person.contract || '100%',
        fte: person.fte || '1.0',
        status: person.status || 'Active',
        maxHours: person.maxHours || 48
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        grade: 'Registrar',
        department: 'A&E',
        contract: '100%',
        fte: '1.0',
        status: 'Active',
        maxHours: 48
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const url = editingStaff ? `/api/doctors/${editingStaff.id}` : '/api/doctors';
      const method = editingStaff ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast(`Staff member ${editingStaff ? 'updated' : 'added'} successfully`, 'success');
        setIsStaffModalOpen(false);
        fetchStaff();
      } else {
        addToast(data.message || 'Failed to save staff member', 'destructive');
      }
    } catch (error) {
      console.error('Save error:', error);
      addToast('An error occurred while saving', 'destructive');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      const response = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        addToast('Staff member deleted', 'success');
        fetchStaff();
      } else {
        addToast('Failed to delete staff member', 'destructive');
      }
    } catch (error) {
      console.error('Delete error:', error);
      addToast('An error occurred while deleting', 'destructive');
    }
  };

  const filteredStaff = staff.filter(person => 
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.grade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workforce</h1>
          <p className="text-muted-foreground mt-1">Manage staff profiles, contracts, and leave requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => addToast('Exporting workforce data...', 'success')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-2">
        <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Top Karma Earner</p>
              <p className="text-xl font-bold mt-1">Dr. Lisa Taylor</p>
              <p className="text-xs text-muted-foreground mt-1">4,200 points • Unlocked Priority Leave</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Critical Fatigue Risk</p>
              <p className="text-xl font-bold text-destructive mt-1">Dr. Lisa Taylor</p>
              <p className="text-xs text-destructive/80 mt-1">Working 3rd consecutive weekend</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Shift Karma</p>
              <p className="text-xl font-bold mt-1">2,270 pts</p>
              <p className="text-xs text-emerald-500 mt-1">+15% engagement this month</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => addToast('Opening advanced filters...', 'info')}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Department</th>
                <th className="px-6 py-3 font-medium">FTE</th>
                <th className="px-6 py-3 font-medium">Karma</th>
                <th className="px-6 py-3 font-medium">Fatigue</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading staff data...
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((person) => (
                  <tr key={person.id} className="bg-card hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{person.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 font-medium">{person.name}</td>
                    <td className="px-6 py-4">{person.grade}</td>
                    <td className="px-6 py-4">{person.department}</td>
                    <td className="px-6 py-4">{person.fte}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {person.karma?.toLocaleString() || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        person.fatigue === 'Low' ? 'success' : 
                        person.fatigue === 'Medium' ? 'warning' : 'destructive'
                      }>
                        {person.fatigue || 'Low'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        person.status === 'Active' ? 'success' : 
                        person.status === 'On Leave' ? 'warning' : 'secondary'
                      }>
                        {person.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(person)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(person.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    No staff members found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredStaff.length} entries</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => addToast('Already on first page', 'info')}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => addToast('Loading next page...', 'info')}>Next</Button>
          </div>
        </div>
      </Card>

      <Modal 
        isOpen={isStaffModalOpen} 
        onClose={() => setIsStaffModalOpen(false)} 
        title={editingStaff ? "Edit Staff Member" : "Add New Staff"}
      >
        <form onSubmit={handleSaveStaff} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. Dr. Sarah Smith"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade / Role</label>
              <select 
                value={formData.grade}
                onChange={(e) => setFormData({...formData, grade: e.target.value})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="Consultant">Consultant</option>
                <option value="Registrar">Registrar</option>
                <option value="SHO">SHO</option>
                <option value="FY2">FY2</option>
                <option value="FY1">FY1</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <select 
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="A&E">A&E</option>
                <option value="ICU">ICU</option>
                <option value="Surgery">Surgery</option>
                <option value="Medicine">Medicine</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contract Type</label>
              <select 
                value={formData.contract}
                onChange={(e) => setFormData({...formData, contract: e.target.value})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="100%">100% (Full Time)</option>
                <option value="80%">80% (Part Time)</option>
                <option value="60%">60% (Part Time)</option>
                <option value="Locum">Locum / Bank</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">FTE</label>
              <input 
                type="text" 
                value={formData.fte}
                onChange={(e) => setFormData({...formData, fte: e.target.value})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="e.g. 1.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Training">Training</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Weekly Hours</label>
              <input 
                type="number" 
                value={formData.maxHours}
                onChange={(e) => setFormData({...formData, maxHours: Number(e.target.value)})}
                className="w-full h-10 px-3 rounded-md bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
