import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import ProblemForm from './ProblemForm';
import AppShell from '../design/AppShell';
import { toast } from '../design/Toaster';
import { problemNo } from '../design/cn';
import { PageBody, Plotter, EmptySheet, Button } from '../design/primitives';

function AdminUpdateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const { data } = await axiosClient.get(`/problem/adminProblemById/${id}`);
        setProblem(data);
      } catch (err) {
        setError('Could not load that problem.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [id]);

  const onSubmit = async (data) => {
    try {
      await axiosClient.put(`/problem/update/${id}`, data);
      toast.success('Problem updated', { description: data.title });
      navigate('/admin/update');
    } catch (error) {
      toast.error('Could not save your changes', {
        description:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message,
      });
    }
  };

  if (loading) {
    return <AppShell><PageBody><Plotter label="Loading problem" /></PageBody></AppShell>;
  }

  if (error || !problem) {
    return (
      <AppShell>
        <PageBody width="max-w-2xl">
          <EmptySheet
            title="Problem not found"
            detail={error || 'This problem may have been deleted.'}
            action={
              <Button size="sm" asChild>
                <Link to="/admin/update"><ArrowLeft className="h-3 w-3" strokeWidth={2} />Back to problems</Link>
              </Button>
            }
          />
        </PageBody>
      </AppShell>
    );
  }

  return (
    <ProblemForm
      heading="Edit problem"
      subheading={`${problemNo(problem.problemNumber)} — ${problem.title}. Changes go live for every solver immediately.`}
      submitLabel="Save changes"
      onSubmit={onSubmit}
      defaultValues={{
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        tags: problem.tags,
        visibleTestCases: problem.visibleTestCases,
        hiddenTestCases: problem.hiddenTestCases,
        startCode: problem.startCode,
        referenceSolution: problem.referenceSolution,
        hints: problem.hints || [],
      }}
    />
  );
}

export default AdminUpdateForm;
