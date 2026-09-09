PRAGMA foreign_keys = ON;

UPDATE project_members
SET project_id = 'cf-notion-st'
WHERE project_id = 'qwerty';

UPDATE workspace_templates
SET project_id = 'cf-notion-st'
WHERE project_id = 'qwerty';
