"use strict";
/// <reference types="xrm" />
var IKL;
(function (IKL) {
    let ProjectManager;
    (function (ProjectManager) {
        class ProjectForm {
            static Form(executionContext) {
                const formContext = executionContext.getFormContext();
                ProjectForm.handleCompletion(formContext);
                ProjectForm.assignTeam(formContext);
                ProjectForm.assignTeamLeader(formContext);
            }
            static handleCompletion(formContext) {
                const status = formContext.getAttribute("bh_projectstatus")?.getValue();
                const completionAttr = formContext.getAttribute("bh_completionpercentage");
                const completionCtrl = formContext.getControl("bh_completionpercentage");
                if (!completionAttr || !completionCtrl)
                    return;
                if (status === "New") {
                    completionAttr.setValue(0);
                    completionCtrl.setDisabled(true);
                }
                else if (status === "In Progress") {
                    completionCtrl.setDisabled(false);
                }
                else if (status === "Completed") {
                    completionAttr.setValue(100);
                    completionCtrl.setDisabled(true);
                }
            }
            static assignTeam(formContext) {
                const projectType = formContext.getAttribute("bh_projecttype")?.getValue();
                const priority = formContext.getAttribute("bh_priority")?.getValue();
                if (projectType === "Client" && priority === "High") {
                    ProjectForm.setTeam(formContext, "Client Support Team");
                }
                else if (projectType === "Research") {
                    ProjectForm.setTeam(formContext, "Research and Development Team");
                }
                else if (projectType === "Internal") {
                    ProjectForm.setTeam(formContext, "Internal Team");
                }
            }
            static setTeam(formContext, teamName) {
                Xrm.WebApi.retrieveMultipleRecords("team", "?$select=name,teamid&$filter=name eq '" + teamName + "'").then(function success(result) {
                    if (result.entities.length > 0) {
                        const team = result.entities[0];
                        formContext.getAttribute("bh_allocatedteam")?.setValue([{
                                id: team.teamid,
                                name: team.name,
                                entityType: "team"
                            }]);
                    }
                    else {
                        formContext.ui.setFormNotification("Insufficient resources. Please contact the Resource Management team.", "WARNING", "teamwarning");
                    }
                });
            }
            static assignTeamLeader(formContext) {
                const projectType = formContext.getAttribute("pl_projecttype")?.getValue();
                const status = formContext.getAttribute("pl_projectstatus")?.getValue();
                const client = formContext.getAttribute("pl_clientname")?.getValue();
                if (projectType === "Client" && status === "Planned" && client && client.length > 0) {
                    const accountId = client[0].id.replace("{", "").replace("}", "");
                    Xrm.WebApi.retrieveRecord("account", accountId, "?$select=_pl_accountmanager_value").then(function success(result) {
                        const accountManager = result["_pl_accountmanager_value"];
                        if (!accountManager) {
                            formContext.ui.setFormNotification("Account Manager is not available in Account.", "WARNING", "accmgrwarning");
                            formContext.getAttribute("pl_teamleader")?.setValue(null);
                            return;
                        }
                        formContext.getAttribute("pl_teamleader")?.setValue([{
                                id: accountManager,
                                name: result["_pl_accountmanager_value@OData.Community.Display.V1.FormattedValue"],
                                entityType: "systemuser"
                            }]);
                    });
                }
            }
            static onSave(executionContext) {
                const formContext = executionContext.getFormContext();
                const eventArgs = executionContext.getEventArgs();
                const teamLeader = formContext.getAttribute("pl_teamleader")?.getValue();
                if (!teamLeader) {
                    eventArgs.preventDefault();
                    Xrm.Navigation.openAlertDialog({
                        text: "Team Leader must be assigned before saving the project."
                    });
                }
            }
        }
        ProjectManager.ProjectForm = ProjectForm;
    })(ProjectManager = IKL.ProjectManager || (IKL.ProjectManager = {}));
})(IKL || (IKL = {}));
