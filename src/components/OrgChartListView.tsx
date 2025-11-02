import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreeNode } from '../types';
import PositionCard from './PositionCard';

/**
 * @interface OrgChartListViewProps
 * @description Defines the props for the OrgChartListView component.
 */
interface OrgChartListViewProps {
  /** The hierarchical data structure representing the organizational chart. */
  tree: TreeNode[];
  /** Callback function to add a subordinate to a given manager. */
  onAddSubordinate: (managerId: string | null) => void;
  /** Callback function to edit an existing position. */
  onEdit: (position: TreeNode) => void;
  /** Callback function to delete a position. */
  onDelete: (id: string) => void;
  /** Callback function to duplicate a position. */
  onDuplicate: (position: TreeNode) => void;
}

/**
 * @description A recursive component that renders a single node (position) and its
 * subordinates in a flat list view, indented to show hierarchy.
 * @param {object} props - The component props.
 */
const OrgChartListItem: React.FC<{ node: TreeNode, onAddSubordinate: (managerId: string | null) => void, onEdit: (position: TreeNode) => void, onDelete: (id: string) => void, onDuplicate: (position: TreeNode) => void }> = ({ node, onAddSubordinate, onEdit, onDelete, onDuplicate }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ marginLeft: node.depth * 20 }} // Indent based on depth
      className="py-2"
    >
      <PositionCard
        position={node}
        onAddSubordinate={() => onAddSubordinate(node.id)}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node.id)}
        onDuplicate={() => onDuplicate(node)}
      />
      <AnimatePresence>
        {node.children.map(child => (
          <OrgChartListItem
            key={child.id}
            node={child}
            onAddSubordinate={onAddSubordinate}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * @description The OrgChartListView component renders the organizational structure
 * as a hierarchical, indented list.
 */
const OrgChartListView: React.FC<OrgChartListViewProps> = ({ tree, onAddSubordinate, onEdit, onDelete, onDuplicate }) => {
  return (
    <motion.div layout className="space-y-2 py-4">
      <AnimatePresence>
        {tree.map(node => (
          <OrgChartListItem
            key={node.id}
            node={node}
            onAddSubordinate={onAddSubordinate}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrgChartListView;