import { useNavigate } from 'react-router';
import { Pencil } from 'lucide-react';
import AdminProblemTable from './AdminProblemTable';
import { Button } from '../design/primitives';

const AdminUpdate = () => {
  const navigate = useNavigate();

  return (
    <AdminProblemTable
      title="Edit a problem"
      detail="Pick a problem to edit its statement, test cases, starter code, hints or reference solutions."
      moduleLabel="Problems"
      emptyDetail="There is nothing to edit yet — add a problem first."
      renderActions={(problem) => (
        <Button size="xs" onClick={() => navigate(`/admin/update/${problem._id}`)}>
          <Pencil className="h-3 w-3" strokeWidth={1.75} />
          Revise
        </Button>
      )}
    />
  );
};

export default AdminUpdate;
