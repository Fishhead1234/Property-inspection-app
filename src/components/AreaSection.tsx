import React, { useState } from 'react';
import type { InspectionArea, ConditionRating, RoomItem } from '../types/inspection';
import { PhotoManager } from './PhotoManager';
import { ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';

interface Props {
  area: InspectionArea;
  index: number;
  onUpdate: (updatedArea: InspectionArea) => void;
  onDelete?: () => void;
}

export const AreaSection: React.FC<Props> = ({ area, index, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(index === 0);
  const [newItemName, setNewItemName] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

  const handleRatingChange = (overallCondition: ConditionRating) => {
    onUpdate({ ...area, overallCondition });
  };

  const handleItemRating = (itemId: string, condition: ConditionRating) => {
    const updatedItems = area.items.map(item =>
      item.id === itemId ? { ...item, condition } : item
    );
    onUpdate({ ...area, items: updatedItems });
  };

  const handleItemComment = (itemId: string, comment: string) => {
    const updatedItems = area.items.map(item =>
      item.id === itemId ? { ...item, comment } : item
    );
    onUpdate({ ...area, items: updatedItems });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: RoomItem = {
      id: 'custom_item_' + Date.now(),
      name: newItemName.trim(),
      condition: 'clean',
      comment: ''
    };
    onUpdate({ ...area, items: [...area.items, newItem] });
    setNewItemName('');
    setShowAddItem(false);
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdate({ ...area, items: area.items.filter(i => i.id !== itemId) });
  };

  const photosCount = area.photos?.length || 0;
  const issuesCount = area.items.filter(i => i.condition === 'damaged' || i.condition === 'fair').length;

  return (
    <div className={`area-card ${area.overallCondition}`}>
      {/* Area Summary Header */}
      <div className="area-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="area-title-group">
          <span className="area-index-badge">{index + 1}</span>
          <div>
            <h3 className="area-title">{area.name}</h3>
            <div className="area-meta-row">
              <span className={`condition-pill ${area.overallCondition}`}>
                {area.overallCondition === 'clean' && '✓ Clean / Good'}
                {area.overallCondition === 'fair' && '▲ Fair / Minor Wear'}
                {area.overallCondition === 'damaged' && '✕ Action Required'}
                {area.overallCondition === 'na' && '— Not Applicable'}
              </span>
              <span className="text-muted text-xs">• {area.items.length} checks</span>
              <span className="text-muted text-xs">• {photosCount} photos</span>
              {issuesCount > 0 && (
                <span className="badge-warning text-xs">
                  {issuesCount} item{issuesCount > 1 ? 's' : ''} flagged
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-center gap-xs">
          <button
            type="button"
            className="btn-icon-subtle"
            aria-label={isOpen ? 'Collapse area' : 'Expand area'}
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      {isOpen && (
        <div className="area-body">
          {/* Overall Area Condition Selector */}
          <div className="overall-selector-box">
            <span className="selector-label">Overall Area Condition:</span>
            <div className="rating-toggle-group">
              <button
                type="button"
                onClick={() => handleRatingChange('clean')}
                className={`rating-btn clean ${area.overallCondition === 'clean' ? 'active' : ''}`}
              >
                <CheckCircle2 size={14} />
                <span>Clean</span>
              </button>
              <button
                type="button"
                onClick={() => handleRatingChange('fair')}
                className={`rating-btn fair ${area.overallCondition === 'fair' ? 'active' : ''}`}
              >
                <AlertTriangle size={14} />
                <span>Fair Wear</span>
              </button>
              <button
                type="button"
                onClick={() => handleRatingChange('damaged')}
                className={`rating-btn damaged ${area.overallCondition === 'damaged' ? 'active' : ''}`}
              >
                <XCircle size={14} />
                <span>Damaged</span>
              </button>
              <button
                type="button"
                onClick={() => handleRatingChange('na')}
                className={`rating-btn na ${area.overallCondition === 'na' ? 'active' : ''}`}
              >
                <MinusCircle size={14} />
                <span>N/A</span>
              </button>
            </div>
          </div>

          {/* Fixtures & Items Checklist Table */}
          <div className="items-checklist-card">
            <div className="flex-between mb-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Room Fixtures &amp; Cleanliness Checks
              </span>
              <button
                type="button"
                onClick={() => setShowAddItem(!showAddItem)}
                className="btn-link text-xs flex-center gap-xs"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            {showAddItem && (
              <form onSubmit={handleAddItem} className="add-item-form mb-sm">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Exhaust fan, Sliding screen, Wall sconce"
                  className="input-text text-xs flex-1"
                  autoFocus
                />
                <button type="submit" className="btn-primary btn-sm">Add</button>
                <button type="button" onClick={() => setShowAddItem(false)} className="btn-secondary btn-sm">Cancel</button>
              </form>
            )}

            <div className="items-list">
              {area.items.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="item-main">
                    <span className="item-name">{item.name}</span>

                    {/* Micro Rating Pills */}
                    <div className="item-pills">
                      <button
                        type="button"
                        onClick={() => handleItemRating(item.id, 'clean')}
                        className={`micro-pill clean ${item.condition === 'clean' ? 'active' : ''}`}
                        title="Clean / Good"
                      >
                        Clean
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemRating(item.id, 'fair')}
                        className={`micro-pill fair ${item.condition === 'fair' ? 'active' : ''}`}
                        title="Fair / Minor Wear"
                      >
                        Fair
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemRating(item.id, 'damaged')}
                        className={`micro-pill damaged ${item.condition === 'damaged' ? 'active' : ''}`}
                        title="Action Required"
                      >
                        Damaged
                      </button>
                    </div>
                  </div>

                  {/* Comment / Defect Note Input (especially useful if fair or damaged) */}
                  <div className="item-comment-row">
                    <input
                      type="text"
                      value={item.comment}
                      onChange={(e) => handleItemComment(item.id, e.target.value)}
                      placeholder={item.condition !== 'clean' ? "Describe defect/wear (e.g. 'Scuff mark near skirting', 'Latch stiff')" : "Optional note..."}
                      className={`item-comment-input ${item.condition !== 'clean' ? 'highlight' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="btn-icon-subtle text-muted hover:text-danger"
                      title="Remove check item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Area General Notes */}
          <div className="area-notes-card">
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-xs">
              Area Observations &amp; Inspector Comments
            </label>
            <textarea
              value={area.notes}
              onChange={(e) => onUpdate({ ...area, notes: e.target.value })}
              placeholder={`General condition notes for ${area.name} (e.g., 'Freshly painted, carpet professionally steam cleaned')...`}
              rows={2}
              className="textarea-input"
            />
          </div>

          {/* Evidence Photos Manager */}
          <PhotoManager
            photos={area.photos}
            areaName={area.name}
            onChange={(photos) => onUpdate({ ...area, photos })}
          />

          {/* Delete Area Option */}
          {onDelete && (
            <div className="delete-area-row">
              <button
                type="button"
                onClick={onDelete}
                className="btn-danger-outline btn-sm flex-center gap-xs"
              >
                <Trash2 size={13} />
                <span>Remove this Area</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
