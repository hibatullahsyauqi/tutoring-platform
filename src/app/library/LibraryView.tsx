'use client';

import { useState } from 'react';
import { createResourceAction } from '@/app/actions/resource';
import { ResourceType } from '@prisma/client';
import { describeError, isRedirectError } from '@/lib/errors';

type ResourceItem = {
  id: string;
  title: string;
  authorOrPublisher: string;
  resourceType: ResourceType;
  url: string | null;
  locationDetails: string | null;
  courseTitle: string;
  boardCode: string;
  topicCode: string | null;
  topicTitle: string | null;
};

type CourseItem = {
  id: string;
  title: string;
  topics: { id: string; code: string; title: string }[];
};

export default function LibraryView({
  resources,
  courses,
}: {
  resources: ResourceItem[];
  courses: CourseItem[];
}) {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Resource Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('PAST_PAPER');
  const [locationDetails, setLocationDetails] = useState('');
  const [url, setUrl] = useState('');

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

  // Filter Logic
  const filtered = resources.filter((r) => {
    const matchesType = selectedType === 'ALL' || r.resourceType === selectedType;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.authorOrPublisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.locationDetails && r.locationDetails.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !selectedCourseId) return;
    setSubmitting(true);

    try {
      await createResourceAction({
        courseId: selectedCourseId,
        topicId: selectedTopicId || undefined,
        title,
        authorOrPublisher: author,
        resourceType,
        locationDetails,
        url,
      });
      setShowAddForm(false);
      setTitle('');
      setLocationDetails('');
      setUrl('');
    } catch (err) {
      if (isRedirectError(err)) throw err;
      console.error('Failed to create resource:', err);
      alert(describeError('Could not save. Please check the details and try again.', err));
    } finally {
      setSubmitting(false);
    }
  };

  const TYPE_BADGES: Record<ResourceType, { label: string; color: string }> = {
    PAST_PAPER: { label: '📄 Past Paper', color: 'bg-red-50 text-red-700 border-red-200' },
    TEXTBOOK: { label: '📚 Textbook Chapter', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    INTUITION_ARTICLE: { label: '💡 Intuition Article', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    SIMULATION: { label: '🕹️ Simulation / Sliders', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    WORKSHEET: { label: '📝 Worksheet / Notes', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  return (
    <section className="glass-panel p-6 space-y-5">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#0f172a]">Teaching Assets</h2>
          <span className="glass-pill text-xs font-bold px-2.5 py-0.5">
            {filtered.length} Asset{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="glass-btn glass-btn-primary"
        >
          {showAddForm ? '✕ Close Form' : '+ Add Asset'}
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { val: 'ALL', label: 'All Resources' },
            { val: 'PAST_PAPER', label: 'Past Papers' },
            { val: 'TEXTBOOK', label: 'Textbooks' },
            { val: 'INTUITION_ARTICLE', label: 'Articles' },
            { val: 'SIMULATION', label: 'Simulations' },
            { val: 'WORKSHEET', label: 'Worksheets' },
          ].map((tab) => (
            <button
              key={tab.val}
              type="button"
              onClick={() => setSelectedType(tab.val)}
              className={`glass-btn whitespace-nowrap glass-btn-sm  ${
                selectedType === tab.val
                  ? 'glass-btn-primary'
                  : ''
              } `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, author, or chapter..."
            className="w-full md:w-72 text-xs glass-input p-2.5"
          />
        </div>
      </div>

      {/* INLINE ADD RESOURCE FORM */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-card-subtle outline outline-2 outline-[#3d6b52]/40 p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2d523e]">
            Index New Teaching Material
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-[#0f172a] mb-1">Title / Identification</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cambridge IGCSE 0580 Paper 42 (May/June 2023) or Haese Chapter 4"
                className="w-full p-2.5 glass-input"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Curriculum Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full p-2.5 font-medium glass-input"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Resource Type</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as ResourceType)}
                className="w-full p-2.5 font-medium glass-input"
              >
                <option value="PAST_PAPER">Past Exam Paper / Question Set</option>
                <option value="TEXTBOOK">Textbook Chapter / Core Reading</option>
                <option value="INTUITION_ARTICLE">Intuition / Explanation Article</option>
                <option value="SIMULATION">Interactive Simulation (GeoGebra/PhET)</option>
                <option value="WORKSHEET">Revision Notes / Worksheet</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Author or Publisher</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Hodder Education, Save My Exams, David Sang"
                className="w-full p-2.5 glass-input"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Physical Location / Chapter Pointer</label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Chapter 4, pp. 62–65, Question 5 & 7"
                className="w-full p-2.5 glass-input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[#0f172a] mb-1">Digital Link / URL (Optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 glass-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="glass-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="glass-btn glass-btn-primary"
            >
              {submitting ? 'Indexing...' : 'Save to Vault'}
            </button>
          </div>
        </form>
      )}

      {/* RESOURCE LIST */}
      {filtered.length === 0 ? (
        <div className="glass-inset p-8 text-center text-xs text-slate-700">
          No teaching materials match this filter or search query.
        </div>
      ) : (
        <div className="divide-y divide-black/5">
          {filtered.map((item) => {
            const badge = TYPE_BADGES[item.resourceType];
            return (
              <article
                key={item.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`glass-badge ${badge.color}`}>{badge.label}</span>
                    <span className="text-xs font-bold text-slate-700">{item.boardCode}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a] leading-snug">{item.title}</h3>
                  <p className="text-xs font-medium text-slate-700">
                    {item.authorOrPublisher} · {item.courseTitle}
                  </p>
                  {item.locationDetails && (
                    <div className="glass-inset inline-block px-3 py-2 text-xs font-mono text-[#0f172a]">
                      📍 {item.locationDetails}
                    </div>
                  )}
                </div>

                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-btn self-start md:self-auto"
                  >
                    Open Link ↗
                  </a>
                ) : (
                  <span className="glass-chip px-3 py-1 text-xs font-semibold self-start md:self-auto">
                    Hardcopy / Drive
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
