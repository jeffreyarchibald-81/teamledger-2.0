import React from 'react';
import { motion } from 'framer-motion';
import { TreeNode } from '../types';
import PositionCard from './PositionCard';

/**
 * @interface OrgChartProps
 * @description Defines the props for the OrgChart component.
 */
interface OrgChartProps {
  /** The hierarchical data structure representing the organizational chart. */
  tree: TreeNode[];
  /** Callback function to add a subordinate to a given manager. */
  onAddSubordinate: (managerId: string) => void;
  /** Callback function to edit an existing position. */
  onEdit: (position: TreeNode) => void;
  /** Callback function to delete a position. */
  onDelete: (id: string) => void;
  /** Callback function to duplicate a position. */
  onDuplicate: (position: TreeNode) => void;
  /** Ref to capture the DOM element for export functionality (e.g., PNG download). */
  captureRef: React.RefObject<HTMLDivElement>;
}

/**
 * @description A recursive component that renders a single node (position) and its
 * subordinates in the organizational chart tree structure.
 * @param {object} props - The component props.
 */
const OrgChartNode: React.FC<{ node: TreeNode, onAddSubordinate: (managerId: string) => void, onEdit: (position: TreeNode) => void, onDelete: (id: string) => void, onDuplicate: (position: TreeNode) => void }> = ({ node, onAddSubordinate, onEdit, onDelete, onDuplicate }) => (
  <li>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="inline-block min-w-[180px] w-full"
    >
      <PositionCard
        position={node}
        onAddSubordinate={() => onAddSubordinate(node.id)}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node.id)}
        onDuplicate={() => onDuplicate(node)}
      />
    </motion.div>
    {node.children.length > 0 && (
      <ul>
        {node.children.map(child => (
          <OrgChartNode
            key={child.id}
            node={child}
            onAddSubordinate={onAddSubordinate}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </ul>
    )}
  </li>
);

/**
 * @description The main OrgChart component that renders the entire hierarchical
 * organizational structure using a tree layout.
 */
const OrgChart: React.FC<OrgChartProps> = ({ tree, onAddSubordinate, onEdit, onDelete, onDuplicate, captureRef }) => {
  return (
    <div ref={captureRef} className="org-tree min-h-[inherit] py-4">
      {tree.length > 0 && (
        <ul>
          {tree.map(node => (
            <OrgChartNode
              key={node.id}
              node={node}
              onAddSubordinate={onAddSubordinate}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrgChart;