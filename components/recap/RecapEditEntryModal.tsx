'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProofUploader } from '@/components/habits/ProofUploader';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { editEntry, removeEntry } from '@/lib/recap';
import { uploadProofImage } from '@/lib/storage';
import { sanitizeNote } from '@/lib/security';
import { RecapEntry } from '@/types/recap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Recap doc id (== localDate). */
  recapDateKey: string;
  entry: RecapEntry | null;
}

/**
 * Edit a single entry on a published recap, within the 24-hour edit
 * window. Two operations:
 *
 *   • Update note + replace proof photo (saves via editEntry).
 *   • Remove the entry entirely (removeEntry). Confirmation guarded
 *     because deletes are not recoverable mid-window.
 *
 * Caller (RecapDetailView) gates rendering by `canEdit(recap)` so this
 * modal never opens past the window. The recap snapshot updates live
 * via the parent's subscription — no need for the modal to reach
 * back into local state on save.
 */
export function RecapEditEntryModal({ isOpen, onClose, recapDateKey, entry }: Props) {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  const [note, setNote] = useState('');
  const [newProofFile, setNewProofFile] = useState<File | null>(null);
  // Tri-state on the existing photo:
  //   - 'keep'    — leave the existing proofImageUrl alone
  //   - 'replace' — user uploaded a new file (newProofFile != null)
  //   - 'remove'  — user explicitly cleared the photo
  const [proofMode, setProofMode] = useState<'keep' | 'replace' | 'remove'>('keep');
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Reset on every open with a fresh entry
  useEffect(() => {
    if (!isOpen || !entry) return;
    setNote(entry.note || '');
    setNewProofFile(null);
    setProofMode('keep');
  }, [isOpen, entry]);

  if (!entry) return null;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanNote = sanitizeNote(note);
      let proofImageUrl: string | undefined = undefined;

      if (proofMode === 'replace' && newProofFile) {
        proofImageUrl = await uploadProofImage(user.uid, entry.logId, newProofFile);
      } else if (proofMode === 'remove') {
        proofImageUrl = '';
      }

      const patch: Partial<Pick<RecapEntry, 'note' | 'proofImageUrl'>> = {};
      if (cleanNote !== entry.note) patch.note = cleanNote;
      if (proofImageUrl !== undefined) patch.proofImageUrl = proofImageUrl;

      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }

      await editEntry(user.uid, recapDateKey, entry.logId, patch);
      addToast({ type: 'success', message: 'Entry updated' });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save changes';
      addToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setRemoving(true);
    try {
      await removeEntry(user.uid, recapDateKey, entry.logId);
      addToast({ type: 'info', message: 'Entry removed from your record' });
      setConfirmRemove(false);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove';
      addToast({ type: 'error', message: msg });
      setRemoving(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit entry">
        <div className="space-y-4">
          {/* Header: which entry */}
          <div className="flex items-center gap-3">
            <CategoryIcon
              slug={entry.habitSlug}
              name={entry.categoryName}
              icon={entry.categoryIcon}
              color={entry.categoryColor}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{entry.categoryName}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                <span style={{ color: entry.categoryColor }} className="font-bold">
                  {entry.value}{entry.unit}
                </span>
                <span className="text-slate-700 mx-1.5">·</span>
                <span>+{entry.xpEarned} XP</span>
              </p>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">
              Note
            </label>
            <Input
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
            />
          </div>

          {/* Proof photo controls */}
          <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c16] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Proof photo
              </span>
              {entry.proofImageUrl && proofMode === 'keep' && (
                <button
                  onClick={() => {
                    setProofMode('remove');
                    setNewProofFile(null);
                  }}
                  className="text-[10px] font-mono text-slate-500 hover:text-red-400"
                >
                  Remove
                </button>
              )}
              {proofMode !== 'keep' && (
                <button
                  onClick={() => {
                    setProofMode('keep');
                    setNewProofFile(null);
                  }}
                  className="text-[10px] font-mono text-slate-500 hover:text-orange-400"
                >
                  Undo
                </button>
              )}
            </div>

            {proofMode === 'keep' && entry.proofImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.proofImageUrl}
                alt="Current proof"
                className="w-full max-h-56 object-cover rounded-lg border border-[#1e1e30]"
              />
            )}

            {proofMode === 'remove' && (
              <p className="text-[11px] text-amber-300 py-3 text-center">
                Photo will be cleared on save. Tap Undo to keep it.
              </p>
            )}

            {(proofMode === 'keep' && !entry.proofImageUrl) || proofMode === 'replace' ? (
              <ProofUploader
                file={newProofFile}
                onFileChange={(f) => {
                  setNewProofFile(f);
                  setProofMode(f ? 'replace' : 'keep');
                }}
              />
            ) : null}

            {proofMode === 'keep' && entry.proofImageUrl && (
              <button
                onClick={() => setProofMode('replace')}
                className="text-[10px] font-mono text-orange-400 hover:text-orange-300 mt-2"
              >
                Replace photo
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-600 leading-relaxed">
            Changes show on your friends&rsquo; feeds the next time they open your record.
            Edits are only allowed inside the 24-hour window after publishing.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRemove(true)}
              disabled={saving}
              className="text-red-400 hover:text-red-300"
            >
              Remove entry
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        title="Remove this entry?"
        description={`The ${entry.categoryName} entry will be deleted from today's record. Friends won't see it. The underlying log keeps your XP and streak — only the recap version is removed.`}
        confirmText="Remove"
        variant="danger"
        loading={removing}
      />
    </>
  );
}
