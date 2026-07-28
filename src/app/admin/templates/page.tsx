'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import styles from './TemplatesAdmin.module.scss';

type TemplateVisibility = 'private' | 'public' | 'assigned';
type TemplateStatus = 'active' | 'archived';

type GameTemplate = {
  id: string;
  title: string;
  description: string | null;
  visibility: TemplateVisibility;
  status: TemplateStatus;
  event_title: string | null;
  event_footer_text: string | null;
  show_event_footer: boolean | null;
};

type TemplateQuestion = {
  id: string;
  template_id: string;
  round_number: number;
  fm_index: number | null;
  question_id: string;
};

type QuestionRow = {
  id: string;
  question_text: string;
};

type Draft = {
  title: string;
  description: string;
  visibility: TemplateVisibility;
  status: TemplateStatus;
};

const roundLabel = (row: TemplateQuestion) => {
  if (row.round_number === 6) return `Fast Money ${row.fm_index ?? ''}`.trim();
  if (row.round_number === 5) return 'Tie Breaker';
  return `Round ${row.round_number}`;
};

function TemplatesAdminContent() {
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [questions, setQuestions] = useState<TemplateQuestion[]>([]);
  const [questionText, setQuestionText] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [assignmentEmails, setAssignmentEmails] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setNotice('');

    let templateQuery = supabase
      .from('game_templates')
      .select('id, title, description, visibility, status, event_title, event_footer_text, show_event_footer')
      .order('updated_at', { ascending: false });

    if (!showArchived) {
      templateQuery = templateQuery.neq('status', 'archived');
    }

    const { data: templateRows, error: templateError } = await templateQuery;

    if (templateError) {
      console.error(templateError);
      setNotice('Could not load templates.');
      setTemplates([]);
      setLoading(false);
      return;
    }

    const typedTemplates = (templateRows ?? []) as GameTemplate[];
    setTemplates(typedTemplates);
    setDrafts(Object.fromEntries(
      typedTemplates.map((template) => [
        template.id,
        {
          title: template.title,
          description: template.description ?? '',
          visibility: template.visibility,
          status: template.status,
        },
      ])
    ));

    const templateIds = typedTemplates.map((template) => template.id);
    if (templateIds.length === 0) {
      setQuestions([]);
      setQuestionText({});
      setLoading(false);
      return;
    }

    const { data: questionRows, error: questionError } = await supabase
      .from('game_template_questions')
      .select('id, template_id, round_number, fm_index, question_id')
      .in('template_id', templateIds)
      .order('round_number', { ascending: true })
      .order('fm_index', { ascending: true });

    if (questionError) {
      console.error(questionError);
      setNotice('Templates loaded, but questions could not be loaded.');
      setQuestions([]);
      setLoading(false);
      return;
    }

    const typedQuestions = (questionRows ?? []) as TemplateQuestion[];
    setQuestions(typedQuestions);

    const questionIds = [...new Set(typedQuestions.map((row) => row.question_id))];
    if (questionIds.length > 0) {
      const { data: qRows, error: qError } = await supabase
        .from('questions')
        .select('id, question_text')
        .in('id', questionIds);

      if (qError) {
        console.error(qError);
      } else {
        setQuestionText(Object.fromEntries(
          ((qRows ?? []) as QuestionRow[]).map((row) => [row.id, row.question_text])
        ));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const questionsByTemplate = useMemo(() => {
    const grouped = new Map<string, TemplateQuestion[]>();
    questions.forEach((question) => {
      const list = grouped.get(question.template_id) ?? [];
      list.push(question);
      grouped.set(question.template_id, list);
    });
    return grouped;
  }, [questions]);

  const updateDraft = (templateId: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [templateId]: {
        ...current[templateId],
        ...patch,
      },
    }));
  };

  const saveTemplate = async (templateId: string) => {
    const draft = drafts[templateId];
    if (!draft?.title.trim()) {
      setNotice('Template title is required.');
      return;
    }

    const { error } = await supabase
      .from('game_templates')
      .update({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        visibility: draft.visibility,
        status: draft.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId);

    if (error) {
      console.error(error);
      setNotice('Could not save template.');
      return;
    }

    setNotice('Template saved.');
    await loadTemplates();
  };

  const archiveTemplate = async (template: GameTemplate) => {
    const nextStatus: TemplateStatus = template.status === 'archived' ? 'active' : 'archived';
    const { error } = await supabase
      .from('game_templates')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', template.id);

    if (error) {
      console.error(error);
      setNotice('Could not update template status.');
      return;
    }

    setNotice(nextStatus === 'archived' ? 'Template archived.' : 'Template restored.');
    await loadTemplates();
  };

  const deleteTemplate = async (template: GameTemplate) => {
    const confirmed = window.confirm(`Delete this template?\n\n${template.title}`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('game_templates')
      .delete()
      .eq('id', template.id);

    if (error) {
      console.error(error);
      setNotice('Could not delete template.');
      return;
    }

    setNotice('Template deleted.');
    await loadTemplates();
  };

  const assignTemplate = async (templateId: string) => {
    const email = assignmentEmails[templateId]?.trim().toLowerCase();
    if (!email) {
      setNotice('Enter a user email to assign this template.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (profileError || !profile) {
      console.error(profileError);
      setNotice('No signed-up user found for that email.');
      return;
    }

    const { error } = await supabase
      .from('game_template_assignments')
      .upsert({ template_id: templateId, user_id: profile.id }, { onConflict: 'template_id,user_id' });

    if (error) {
      console.error(error);
      setNotice('Could not assign template.');
      return;
    }

    await supabase
      .from('game_templates')
      .update({ visibility: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', templateId);

    setAssignmentEmails((current) => ({ ...current, [templateId]: '' }));
    setNotice(`Template assigned to ${profile.email ?? email}.`);
    await loadTemplates();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.backLink} href="/sessions">Back to sessions</Link>
          <h1>Template Manager</h1>
          <p>Manage ready-made games, custom assigned games, and template visibility.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.headerLink} href="/admin/setup">Create Game</Link>
          <Link className={styles.headerLink} href="/admin/users">Users</Link>
          <Link className={styles.headerLink} href="/admin/questions">Question Bank</Link>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {notice && <div className={styles.notice}>{notice}</div>}

      {loading ? (
        <div className={styles.empty}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className={styles.empty}>No templates found. Publish a session from the sessions dashboard first.</div>
      ) : (
        <section className={styles.grid}>
          {templates.map((template) => {
            const draft = drafts[template.id];
            const templateQuestions = questionsByTemplate.get(template.id) ?? [];

            return (
              <article className={styles.card} key={template.id}>
                <div className={styles.meta}>
                  <span className={`${styles.badge} ${template.status === 'active' ? styles.active : styles.archived}`}>
                    {template.status}
                  </span>
                  <span className={styles.badge}>{template.visibility}</span>
                  <span className={styles.badge}>{templateQuestions.length} questions</span>
                </div>

                {draft && (
                  <div className={styles.form}>
                    <label>
                      Title
                      <input
                        value={draft.title}
                        onChange={(event) => updateDraft(template.id, { title: event.target.value })}
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        value={draft.description}
                        onChange={(event) => updateDraft(template.id, { description: event.target.value })}
                      />
                    </label>

                    <label>
                      Visibility
                      <select
                        value={draft.visibility}
                        onChange={(event) => updateDraft(template.id, { visibility: event.target.value as TemplateVisibility })}
                      >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                        <option value="assigned">Assigned</option>
                      </select>
                    </label>

                    <div className={styles.actions}>
                      <button className={styles.primary} onClick={() => saveTemplate(template.id)}>
                        Save
                      </button>
                      <button onClick={() => archiveTemplate(template)}>
                        {template.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                      <button onClick={() => deleteTemplate(template)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.assignment}>
                  <h3>Assign To User</h3>
                  <div className={styles.assignmentRow}>
                    <input
                      value={assignmentEmails[template.id] ?? ''}
                      onChange={(event) => setAssignmentEmails((current) => ({
                        ...current,
                        [template.id]: event.target.value,
                      }))}
                      placeholder="user@example.com"
                      type="email"
                    />
                    <div className={styles.actions}>
                      <button onClick={() => assignTemplate(template.id)}>Assign</button>
                    </div>
                  </div>
                </div>

                <div className={styles.questions}>
                  <h3>Included Questions</h3>
                  {templateQuestions.length === 0 ? (
                    <div className={styles.empty}>No questions found for this template.</div>
                  ) : (
                    <ul className={styles.questionList}>
                      {templateQuestions.map((question) => (
                        <li key={question.id}>
                          <span>{roundLabel(question)}</span>
                          <strong>{questionText[question.question_id] ?? 'Question unavailable'}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default function TemplatesAdminPage() {
  return (
    <AuthGate adminOnly>
      <TemplatesAdminContent />
    </AuthGate>
  );
}
