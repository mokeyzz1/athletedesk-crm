-- Add notification preferences to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notify_follow_ups BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_task_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_assignments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_weekly_summary BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN users.notify_follow_ups IS 'Email notifications for follow-up reminders';
COMMENT ON COLUMN users.notify_task_reminders IS 'Email notifications for task reminders';
COMMENT ON COLUMN users.notify_new_assignments IS 'Email notifications when athletes are assigned';
COMMENT ON COLUMN users.notify_weekly_summary IS 'Weekly activity digest email';
