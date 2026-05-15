"use strict";
/// <reference types="@types/xrm"/>
var ProjectLibrary;
(function (ProjectLibrary) {
    class ProjectForm {
        // Store all field logical names in one place for easy maintenance
        static Fields = {
            Type: "hd_projecttype",
            Status: "hd_projectstatus",
            Deadline: "hd_projectdeadline",
            AllocatedBudget: "hd_allocatedbudget",
            AllocatedTeam: "hd_allocatedteam",
            Priority: "hd_priority",
            TeamLeader: "hd_teamleader",
            ClientName: "hd_clientname",
            CompletionPercentage: "hd_completionpercentage",
        };
        // Map numerical values to readable labels for better code clarity
        static Enums = {
            Type: { Internal: 1, Client: 2, Research: 3 },
            Status: { New: 1, Planned: 2, InProgress: 3, OnHold: 4, Completed: 5 },
            Priority: { Low: 1, Medium: 2, High: 3 },
        };
        // Runs when the record form is opened
        static async onFormLoad(params) {
            const formContext = params.getFormContext();
            // Only run specific logic if creating a new record
            if (formContext.ui.getFormType() === 1) {
                await ProjectForm.handleAutomaticResourceAllocation(formContext);
                await ProjectForm.handleTeamLeaderAssignment(formContext);
            }
            // Set initial field locking and values based on completion percentage
            ProjectForm.handleProjectCompletionPercentage(formContext);
        }
        // Runs when the user attempts to save the record
        static onFormSave(params) {
            const formContext = params.getFormContext();
            const teamLeaderAttr = formContext.getAttribute(ProjectForm.Fields.TeamLeader);
            if (teamLeaderAttr) {
                const leader = teamLeaderAttr.getValue();
                // Ensure a Team Leader is present; if not, block the save and show an error
                if (!leader || leader.length === 0) {
                    Xrm.Navigation.openErrorDialog({
                        message: "A Team Leader must be assigned before starting the project and prevent record form saving.",
                    });
                    params.getEventArgs().preventDefault(); // Stops the save
                }
            }
        }
        // Triggered when the Status field is changed
        static async onStatusChange(params) {
            const formContext = params.getFormContext();
            ProjectForm.handleProjectCompletionPercentage(formContext);
            ProjectForm.validateDeadline(formContext);
            await ProjectForm.handleTeamLeaderAssignment(formContext);
        }
        // Triggered when the Client lookup field is changed
        static async onClientChange(params) {
            const formContext = params.getFormContext();
            await ProjectForm.handleTeamLeaderAssignment(formContext);
        }
        // Triggered when either Project Type or Deadline fields are modified
        static async onTypeOrDeadlineChange(params) {
            const formContext = params.getFormContext();
            ProjectForm.validateDeadline(formContext);
            await ProjectForm.handleAutomaticResourceAllocation(formContext);
            await ProjectForm.handleTeamLeaderAssignment(formContext);
        }
        // Triggered when the Priority field is changed
        static async onPriorityChange(params) {
            const formContext = params.getFormContext();
            await ProjectForm.handleAutomaticResourceAllocation(formContext);
        }
        // Validates the completion percentage value as the user types
        static onCompletionPercentageChange(params) {
            const formContext = params.getFormContext();
            const statusAttr = formContext.getAttribute(ProjectForm.Fields.Status);
            const pctAttr = formContext.getAttribute(ProjectForm.Fields.CompletionPercentage);
            const pctCtrl = formContext.getControl(ProjectForm.Fields.CompletionPercentage);
            // Ensure percentage is between 1 and 99 when the project is active
            if (statusAttr && pctAttr && pctCtrl) {
                const status = statusAttr.getValue();
                const pct = pctAttr.getValue();
                // When In Progress, allow manual updates from 1% to 99% only.
                if (status === ProjectForm.Enums.Status.InProgress) {
                    if (pct !== null && (pct < 1 || pct > 99)) {
                        pctCtrl.setNotification("Percentage must be between 1 and 99 when In Progress.", "pct_err");
                    }
                    else {
                        pctCtrl.clearNotification("pct_err");
                    }
                }
            }
        }
        // REQUIREMENTS
        // Deadline Management
        static validateDeadline(formContext) {
            const typeAttr = formContext.getAttribute(ProjectForm.Fields.Type);
            const statusAttr = formContext.getAttribute(ProjectForm.Fields.Status);
            const deadlineAttr = formContext.getAttribute(ProjectForm.Fields.Deadline);
            const deadlineCtrl = formContext.getControl(ProjectForm.Fields.Deadline);
            if (typeAttr && statusAttr && deadlineAttr && deadlineCtrl) {
                const type = typeAttr.getValue();
                const status = statusAttr.getValue();
                const deadline = deadlineAttr.getValue();
                if (type === ProjectForm.Enums.Type.Client &&
                    status === ProjectForm.Enums.Status.InProgress &&
                    deadline) {
                    const today = new Date();
                    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 30) {
                        Xrm.Navigation.openAlertDialog({
                            text: "Client projects must have a deadline within 30 days.",
                        });
                        deadlineCtrl.setNotification("Deadline is over 30 days.", "deadline_err");
                    }
                    else {
                        deadlineCtrl.clearNotification("deadline_err");
                    }
                }
                else {
                    deadlineCtrl.clearNotification("deadline_err"); // Internal allows any future date
                }
            }
        }
        // Project Completion Percentage
        static handleProjectCompletionPercentage(formContext) {
            const statusAttr = formContext.getAttribute(ProjectForm.Fields.Status);
            const pctAttr = formContext.getAttribute(ProjectForm.Fields.CompletionPercentage);
            const pctCtrl = formContext.getControl(ProjectForm.Fields.CompletionPercentage);
            if (statusAttr && pctAttr && pctCtrl) {
                const status = statusAttr.getValue();
                if (status === ProjectForm.Enums.Status.New) {
                    pctAttr.setValue(0);
                    pctCtrl.setDisabled(true); // Lock
                }
                else if (status === ProjectForm.Enums.Status.InProgress) {
                    pctCtrl.setDisabled(false); // Unlock for 1-99 updates
                }
                else if (status === ProjectForm.Enums.Status.Completed) {
                    pctAttr.setValue(100);
                    pctCtrl.setDisabled(true); // Lock
                }
            }
        }
        //  Automatic Resource Allocation
        static async handleAutomaticResourceAllocation(formContext) {
            const typeAttr = formContext.getAttribute(ProjectForm.Fields.Type);
            const priorityAttr = formContext.getAttribute(ProjectForm.Fields.Priority);
            if (typeAttr && priorityAttr) {
                const type = typeAttr.getValue();
                const priority = priorityAttr.getValue();
                let teamName = "";
                if (type === ProjectForm.Enums.Type.Client &&
                    priority === ProjectForm.Enums.Priority.High)
                    teamName = "Client Support Team";
                else if (type === ProjectForm.Enums.Type.Research)
                    teamName = "Research and Development";
                else if (type === ProjectForm.Enums.Type.Internal)
                    teamName = "Internal";
                if (teamName) {
                    try {
                        const results = await Xrm.WebApi.retrieveMultipleRecords("team", `?$select=teamid&$filter=name eq '${teamName}'`);
                        if (results.entities.length > 0) {
                            const teamId = results.entities[0].teamid;
                            const members = await Xrm.WebApi.retrieveMultipleRecords("teammembership", `?$filter=teamid eq ${teamId}`);
                            if (members.entities.length === 0) {
                                formContext.ui.setFormNotification("Insufficient resources. Please contact the Resource Management team.", "WARNING", "res_warn");
                            }
                            else {
                                formContext
                                    .getAttribute(ProjectForm.Fields.AllocatedTeam)
                                    ?.setValue([
                                    { id: teamId, name: teamName, entityType: "team" },
                                ]);
                                formContext.ui.clearFormNotification("res_warn");
                            }
                        }
                    }
                    catch (e) {
                        console.log("API Error: " + e.message);
                    }
                }
            }
        }
        // Team Leader Assignment Logic
        static async handleTeamLeaderAssignment(formContext) {
            const typeAttr = formContext.getAttribute(ProjectForm.Fields.Type);
            const statusAttr = formContext.getAttribute(ProjectForm.Fields.Status);
            const clientAttr = formContext.getAttribute(ProjectForm.Fields.ClientName);
            if (typeAttr && statusAttr && clientAttr) {
                const type = typeAttr.getValue();
                const status = statusAttr.getValue();
                const client = clientAttr.getValue();
                if (type === ProjectForm.Enums.Type.Client &&
                    status === ProjectForm.Enums.Status.Planned &&
                    client &&
                    client.length > 0) {
                    const id = client[0]?.id?.replace(/[{}]/g, "");
                    if (id) {
                        try {
                            const res = await Xrm.WebApi.retrieveRecord("account", id, "?$select=_hd_accountmanager_value");
                            const mId = res["_hd_accountmanager_value"];
                            const mName = res["_hd_accountmanager_value@OData.Community.Display.V1.FormattedValue"];
                            if (mId) {
                                formContext
                                    .getAttribute(ProjectForm.Fields.TeamLeader)
                                    ?.setValue([
                                    { id: mId, name: mName, entityType: "systemuser" },
                                ]);
                            }
                        }
                        catch (e) {
                            console.log("API Error: " + e.message);
                        }
                    }
                }
            }
        }
    }
    ProjectLibrary.ProjectForm = ProjectForm;
})(ProjectLibrary || (ProjectLibrary = {}));
