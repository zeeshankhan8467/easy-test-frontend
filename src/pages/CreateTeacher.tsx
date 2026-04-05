import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { schoolService, type School } from '@/services/schools';
import { authService } from '@/services/auth';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';

export function CreateTeacher() {
  const [schools, setSchools] = useState<School[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = authService.getCurrentUser();
  const isSchoolAdmin = user?.role === 'school_admin';

  useEffect(() => {
    schoolService.getAll().then(setSchools).catch(() => setSchools([])).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Validation', description: 'Email and password are required', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Validation', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (!isSchoolAdmin && !schoolId) {
      toast({ title: 'Validation', description: 'School is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await schoolService.createTeacher({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        school_id: isSchoolAdmin ? undefined : (schoolId ? parseInt(schoolId, 10) : undefined),
      });
      toast({ title: 'Success', description: 'Teacher created.' });
      navigate('/');
    } catch (e: any) {
      const data = e.response?.data;
      const msg = data?.email?.[0] || data?.error || data?.detail || 'Failed to create Teacher';
      toast({ title: 'Error', description: String(msg), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Teacher</h1>
        <p className="text-muted-foreground mt-2">
          {isSchoolAdmin ? 'Add a teacher to your school.' : 'Add a new Teacher (Super Admin or School Admin).'}
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            New Teacher
          </CardTitle>
          <CardDescription>They will have access only to their own exams and data.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
              />
            </div>
            {!isSchoolAdmin && (
              <div className="space-y-2">
                <Label>School *</Label>
                <Select value={schoolId} onValueChange={setSchoolId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isSchoolAdmin && <p className="text-sm text-muted-foreground">Teacher will be assigned to your school.</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Teacher
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
