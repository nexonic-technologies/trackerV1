import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { FiPaperclip, FiLoader, FiSend, FiHash, FiChevronDown, FiSearch } from 'react-icons/fi';
import { MdOutlineCampaign } from 'react-icons/md';
import ProfileImage from '../Common/ProfileImage';

const POST_TYPES = [
  { id: 'Update', label: 'Post' },
  { id: 'Announcement', label: 'Announcement' },
  { id: 'Question', label: 'Question' },
];

const TARGET_DOT_COLORS = [
  'bg-orange-400',
  'bg-sky-500',
  'bg-slate-400',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-400',
];

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block', 'link'],
    ['clean'],
  ],
};

function displayName(user) {
  const first = user?.basicInfo?.firstName || '';
  const last = user?.basicInfo?.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || user?.name || 'User';
}

function dotColor(index) {
  return TARGET_DOT_COLORS[index % TARGET_DOT_COLORS.length];
}

function FeedTargetPicker({ items, value, onChange, placeholder, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = items.find((item) => item._id === value);
  const selectedIndex = items.findIndex((item) => item._id === value);

  const filtered = items.filter((item) =>
    (item.name || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="lmx-feed-composer__picker relative min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="lmx-feed-composer__picker-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <span className="inline-flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor(selectedIndex)}`} />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-ink-subtle">{placeholder}</span>
        )}
        <FiChevronDown className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="lmx-feed-composer__picker-menu" role="listbox">
          <div className="p-2 border-b border-hairline-soft">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="lmx-input pl-9 py-2 text-sm"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-ink-subtle text-center">No results</li>
            ) : (
              filtered.map((item) => {
                const index = items.findIndex((i) => i._id === item._id);
                const isActive = item._id === value;
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(item._id)}
                      className={`lmx-feed-composer__picker-option ${isActive ? 'lmx-feed-composer__picker-option--active' : ''}`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor(index)}`} />
                      <span className="truncate">{item.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function FeedComposer({
  user,
  expanded,
  onExpand,
  onCollapse,
  postType,
  setPostType,
  postSubject,
  setPostSubject,
  postContent,
  onContentChange,
  targetType,
  setTargetType,
  targetId,
  setTargetId,
  groups = [],
  channels = [],
  expiryDays,
  setExpiryDays,
  onSubmit,
  onSaveDraft,
  loading,
  showMentions,
  mentionList = [],
  onSelectMention,
}) {
  const isEmpty = !postContent.trim() || postContent === '<p><br></p>';
  const isChannelMode = targetType === 'Channel';
  const targetList = isChannelMode ? channels : groups;
  const targetPlaceholder = isChannelMode ? 'Select channel…' : 'Select group…';
  const targetSearchPlaceholder = isChannelMode ? 'Search channel…' : 'Search group…';

  const postLabel = useMemo(
    () => POST_TYPES.find((t) => t.id === postType)?.label || 'Post',
    [postType]
  );

  const setDestination = (mode) => {
    setTargetType(mode);
    setTargetId('');
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="tracker-card-plain w-full p-3 flex items-center gap-3 text-left hover:border-[var(--module-accent)] transition-all duration-200 group"
      >
        <ProfileImage
          profileImage={user?.basicInfo?.profileImage}
          firstName={user?.basicInfo?.firstName}
          lastName={user?.basicInfo?.lastName}
          size="sm"
          className="!w-10 !h-10 shrink-0"
        />
        <span className="flex-1 rounded-tracker-md border border-hairline px-4 py-2.5 text-sm text-ink-subtle bg-surface-1 group-hover:bg-surface group-hover:border-[var(--module-accent)] transition-all">
          Share an update, question, or announcement…
        </span>
      </button>
    );
  }

  return (
    <section className="lmx-feed-composer tracker-card-plain animate-fade-in">
      {/* Post to — destination pills */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 border-b border-hairline-soft">
        <span className="text-sm font-medium text-ink-muted shrink-0">Post to:</span>
        <button
          type="button"
          onClick={() => setDestination('Channel')}
          className={`lmx-feed-composer__dest-pill ${isChannelMode ? 'lmx-feed-composer__dest-pill--active' : ''}`}
        >
          <FiHash className="h-3.5 w-3.5 shrink-0" />
          Single Channel
        </button>
        <button
          type="button"
          onClick={() => setDestination('Group')}
          className={`lmx-feed-composer__dest-pill ${!isChannelMode ? 'lmx-feed-composer__dest-pill--active' : ''}`}
        >
          <MdOutlineCampaign className="h-3.5 w-3.5 shrink-0" />
          Broadcast to Group
        </button>
      </div>

      {/* User row + post type tabs */}
      <div className="relative z-20 flex flex-col gap-3 px-4 py-3 border-b border-hairline-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <ProfileImage
            profileImage={user?.basicInfo?.profileImage}
            firstName={user?.basicInfo?.firstName}
            lastName={user?.basicInfo?.lastName}
            size="sm"
            className="!w-8 !h-8 shrink-0"
          />
          <span className="text-sm font-semibold text-ink whitespace-nowrap">{displayName(user)}</span>
          <span className="text-sm text-ink-subtle">in</span>
          <FeedTargetPicker
            items={targetList}
            value={targetId}
            onChange={setTargetId}
            placeholder={targetPlaceholder}
            searchPlaceholder={targetSearchPlaceholder}
          />
        </div>

        <div className="lmx-feed-composer__type-tabs shrink-0" role="tablist" aria-label="Post type">
          {POST_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={postType === id}
              onClick={() => setPostType(id)}
              className={postType === id ? 'lmx-feed-composer__type-tab--active' : 'lmx-feed-composer__type-tab'}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcement expiry — only when Announcement selected */}
      {postType === 'Announcement' && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-tracker-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <MdOutlineCampaign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Expires in</span>
          <input
            type="number"
            min="1"
            max="365"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="lmx-input w-16 py-1 text-xs text-center font-semibold"
          />
          <span className="text-xs text-amber-700 dark:text-amber-400">days</span>
        </div>
      )}

      {/* Subject — underline style (red when empty, accent when filled) */}
      <div className="px-4 pt-4">
        <input
          id="feed-post-subject"
          type="text"
          value={postSubject}
          onChange={(e) => setPostSubject(e.target.value)}
          placeholder="Subject *"
          className={`lmx-feed-composer__subject ${postSubject.trim() ? 'lmx-feed-composer__subject--filled' : ''}`}
        />
      </div>

      {/* Rich text — toolbar at bottom */}
      <div className="px-4 py-3">
        <div className="lmx-feed-composer__editor relative">
          <ReactQuill
            theme="snow"
            value={postContent}
            onChange={onContentChange}
            modules={quillModules}
            placeholder="Write a description…"
          />
          {showMentions && mentionList.length > 0 && (
            <div className="absolute z-50 tracker-card-plain !border-l-0 max-h-56 overflow-y-auto w-72 bottom-12 left-0 shadow-lg">
              {mentionList.map((emp) => (
                <button
                  key={emp._id}
                  type="button"
                  onClick={() => onSelectMention(emp)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-surface-1 transition-colors border-b border-hairline-soft last:border-0 text-left"
                >
                  <ProfileImage
                    profileImage={emp.basicInfo?.profileImage}
                    firstName={emp.basicInfo?.firstName}
                    lastName={emp.basicInfo?.lastName}
                    size="sm"
                    className="!w-8 !h-8"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                    </p>
                    <p className="text-[11px] text-ink-subtle truncate">
                      {emp.professionalInfo?.designation || 'Member'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-hairline-soft">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <FiPaperclip className="h-4 w-4" />
          Attach
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={onCollapse} className="lmx-feed-composer__footer-link">
            Cancel
          </button>
          {onSaveDraft && (
            <button type="button" onClick={onSaveDraft} className="lmx-feed-composer__draft-btn">
              Save draft
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || isEmpty}
            className="lmx-feed-composer__post-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
            {postLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
