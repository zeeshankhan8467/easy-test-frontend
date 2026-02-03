import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { participantService, Participant, ParticipantCreate } from '@/services/participants';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Plus, Loader2, Trash2, Edit } from 'lucide-react';

export function Participants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [newParticipant, setNewParticipant] = useState<ParticipantCreate>({
    name: '',
    email: '',
    clicker_id: '',
  });

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      const data = await participantService.getAll();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setParticipants(data);
      } else if (data && Array.isArray(data.results)) {
        setParticipants(data.results);
      } else {
        console.warn('Unexpected data format:', data);
        setParticipants([]);
      }
    } catch (error: any) {
      console.error('Failed to load participants:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load participants',
        variant: 'destructive',
      });
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await participantService.create(newParticipant);
      toast({
        title: 'Success',
        description: 'Participant created successfully',
      });
      setCreateDialogOpen(false);
      setNewParticipant({ name: '', email: '', clicker_id: '' });
      loadParticipants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create participant',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      const result = await participantService.import({ file: selectedFile });
      toast({
        title: 'Success',
        description: `Imported ${result.imported} participants`,
      });
      if (result.errors.length > 0) {
        toast({
          title: 'Warning',
          description: `${result.errors.length} errors occurred`,
          variant: 'destructive',
        });
      }
      setImportDialogOpen(false);
      setSelectedFile(null);
      loadParticipants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to import participants',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await participantService.delete(id);
      toast({
        title: 'Success',
        description: 'Participant deleted successfully',
      });
      loadParticipants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete participant',
        variant: 'destructive',
      });
    }
  };

  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Participants</h1>
          <p className="text-muted-foreground mt-2">
            Manage exam participants
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV/Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Participants</DialogTitle>
                <DialogDescription>
                  Upload a CSV or Excel file with participant data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={!selectedFile}>
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Participant</DialogTitle>
                <DialogDescription>
                  Create a new participant entry
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newParticipant.name}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newParticipant.email}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clicker_id">Clicker ID</Label>
                  <Input
                    id="clicker_id"
                    value={newParticipant.clicker_id || ''}
                    onChange={(e) =>
                      setNewParticipant({
                        ...newParticipant,
                        clicker_id: e.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>
            {safeParticipants.length} participant(s) registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {safeParticipants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No participants yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Participant
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clicker ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">
                      {participant.name}
                    </TableCell>
                    <TableCell>{participant.email}</TableCell>
                    <TableCell>
                      {participant.clicker_id || (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(participant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(participant.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

