-- AlterTable
ALTER TABLE `FormCollaborationDelegation` MODIFY `status` ENUM('PENDING', 'VIEWED', 'SUBMITTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- Backfill: delegation with linked response was already answered
UPDATE `FormCollaborationDelegation` AS d
INNER JOIN `FormCollaborationResponse` AS r ON r.id = d.linkedResponseId
SET d.status = 'SUBMITTED'
WHERE d.mode = 'FILL'
  AND r.status = 'SUBMITTED'
  AND d.status = 'PENDING';
