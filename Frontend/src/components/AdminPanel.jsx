import { useNavigate } from 'react-router';
import axiosClient from '../utils/axiosClient';
import ProblemForm from './ProblemForm';
import { toast } from '../design/Toaster';

function AdminPanel() {
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await axiosClient.post('/problem/create', data);
      toast.success('Problem added', { description: data.title });
      navigate('/admin/update');
    } catch (error) {
      toast.error('Could not add that problem', {
        description:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message,
      });
    }
  };

  return (
    <ProblemForm
      heading="Add a new problem"
      subheading="Author the statement, the cases the solver sees, the hidden suite it is judged on, and the reference solutions."
      submitLabel="Add problem"
      onSubmit={onSubmit}
    />
  );
}

export default AdminPanel;
