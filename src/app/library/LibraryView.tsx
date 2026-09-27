'use client';

import { useState } from 'react';
import { createResourceAction } from '@/app/actions/resource';
import { ResourceType } from '@prisma/client';

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
      console.error('Failed to create resource:', err);
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
    <div className="space-y-6">
      
      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-[#ddd8cd] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                selectedType === tab.val
                  ? 'bg-[#3d6b52] text-white'
                  : 'bg-[#faf9f6] text-[#6f6b62] border border-[#ddd8cd] hover:bg-[#e8efe9]'
              }`}
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
            className="w-full md:w-64 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#3d6b52]"
          />
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#3d6b52] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-[#2d523e] transition-colors"
          >
            {showAddForm ? '✕ Close Form' : '+ Add Asset'}
          </button>
        </div>
      </div>

      {/* INLINE ADD RESOURCE FORM */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white border-2 border-[#3d6b52]/30 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3d6b52]">
            Index New Teaching Material
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-[#2b2b28] mb-1">Title / Identification</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cambridge IGCSE 0580 Paper 42 (May/June 2023) or Haese Chapter 4"
                className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Curriculum Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 font-medium focus:outline-none focus:border-[#3d6b52]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Resource Type</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as ResourceType)}
                className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 font-medium focus:outline-none focus:border-[#3d6b52]"
              >
                <option value="PAST_PAPER">Past Exam Paper / Question Set</option>
                <option value="TEXTBOOK">Textbook Chapter / Core Reading</option>
                <option value="INTUITION_ARTICLE">Intuition / Explanation Article</option>
                <option value="SIMULATION">Interactive Simulation (GeoGebra/PhET)</option>
                <option value="WORKSHEET">Revision Notes / Worksheet</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Author or Publisher</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Hodder Education, Save My Exams, David Sang"
                className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Physical Location / Chapter Pointer</label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Chapter 4, pp. 62–65, Question 5 & 7"
                className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[#2b2b28] mb-1">Digital Link / URL (Optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-[#ddd8cd] rounded-lg text-xs font-bold text-[#6f6b62]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#3d6b52] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#2d523e] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Indexing...' : 'Save to Vault'}
            </button>
          </div>
        </form>
      )}

      {/* RESOURCE CARDS GRID */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#ddd8cd] rounded-xl p-10 text-center text-xs text-[#6f6b62]">
          No teaching materials match this filter or search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const badge = TYPE_BADGES[item.resourceType];
            return (
              <article
                key={item.id}
                className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-semibold text-[#6f6b62]">
                      {item.boardCode}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#2b2b28] leading-snug">{item.title}</h3>
                  <p className="text-xs text-[#6f6b62]">{item.authorOrPublisher}</p>

                  {item.locationDetails && (
                    <div className="p-2.5 bg-[#faf9f6] border border-[#ddd8cd]/60 rounded-lg text-xs font-mono text-[#2b2b28]">
                      📍 {item.locationDetails}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#ddd8cd]/50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#6f6b62] truncate max-w-[240px]">
                    {item.courseTitle}
                  </span>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#3d6b52] hover:underline inline-flex items-center gap-1"
                    >
                      Open Link ↗
                    </a>
                  ) : (
                    <span className="text-[10px] font-medium text-[#6f6b62]">Hardcopy/Drive</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}