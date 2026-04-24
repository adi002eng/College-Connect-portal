DROP TRIGGER IF EXISTS notify_team_application_on_insert ON public.team_applications;
CREATE TRIGGER notify_team_application_on_insert
AFTER INSERT ON public.team_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_application();

DROP TRIGGER IF EXISTS notify_application_status_on_update ON public.team_applications;
CREATE TRIGGER notify_application_status_on_update
AFTER UPDATE ON public.team_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_status();

DROP TRIGGER IF EXISTS notify_new_message_on_insert ON public.messages;
CREATE TRIGGER notify_new_message_on_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();