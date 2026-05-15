// /// <reference types="@types/xrm" />

// namespace BH {
//     export namespace ProjectModule {
//         export namespace Project {
//             export class ProjectFormLibrary {

//                 // This function will be called when the form loads or fields change
//                 public static handleDeadlineLogic(context: Xrm.Events.EventContext): void {
//                     const formContext = context.getFormContext();
                    
//                     // 1. Get values (Note: Values like 1, 2, 3 depend on your Choice Set configuration)
//                     const projectType = formContext.getAttribute("bh_projectype")!.getValue(); 
//                     const projectStatus = formContext.getAttribute("bh_projectstatus")!.getValue();
//                     const deadlineValue = formContext.getAttribute("bh_projectdeadline")!.getValue();
//                     // const deadlineValue = deadlineAttr!.getValue();

//                     // Check: Type is Client (2) and Status is In Progress (3)
//                     if (projectType === 2 && projectStatus === 3 && deadlineValue) {
//                         const today = new Date();
//                         const thirtyDaysFromNow = new Date();
//                         thirtyDaysFromNow.setDate(today.getDate() + 30);

//                         if (deadlineValue > thirtyDaysFromNow) {
//                             Xrm.Navigation.openAlertDialog({ text: "Client projects must have a deadline within 30 days." });
//                         }
//                     }
//                 }
//             }
//         }
//     }
// }
/// <reference types="@types/xrm" />

namespace BH {
    
            export class ProjectFormLibrary {

                /**
                 * Main OnLoad event: Register change events and set initial state
                 */
                public static onLoad(context: Xrm.Events.EventContext): void {
                    const formContext = context.getFormContext();

                    // Register OnChange Events
                    formContext.getAttribute("bh_projectstatus")!.addOnChange(this.handleProjectLogic);
                    formContext.getAttribute("bh_projecttype")!.addOnChange(this.handleProjectLogic);
                    formContext.getAttribute("bh_priority")!.addOnChange(this.handleProjectLogic);

                    // Run once on load to initialize fields
                    this.handleProjectLogic(context);
                }

                /**
                 * Consolidates logic for Status, Type, and Priority changes
                 */
                public static handleProjectLogic(context: Xrm.Events.EventContext): void {
                    const formContext = context.getFormContext();
                    
                    //  DEADLINE MANAGEMENT & RESOURCE ALLOCATION ---
                    const projectType = formContext.getAttribute("bh_projecttype")!.getValue(); // 1:Internal, 2:Client, 3:Research
                    const status = formContext.getAttribute("bh_projectstatus")!.getValue(); // 1:New, 2:Planned, 3:In Progress, 5:Completed
                    const priority = formContext.getAttribute("bh_priority")!.getValue(); // 3: High
                    const deadlineAttr = formContext.getAttribute("bh_projectdeadline") as Xrm.Attributes.DateAttribute;

                    // Deadline Alert
                    if (projectType === 121180001 && status === 121180002 && deadlineAttr!.getValue()) {
                        const deadline = deadlineAttr!.getValue();
                        const today = new Date();
                        const diffDays = Math.ceil(Math.abs(deadline!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        if (diffDays > 30) {
                            Xrm.Navigation.openAlertDialog({ text: "Client projects must have a deadline within 30 days." });
                        }
                    }

                    // Allocation Notifications
                    formContext.ui.clearFormNotification("alloc_msg");
                    if (priority === 121180002 && projectType === 121180001) {
                        formContext.ui.setFormNotification("Assigning to: Client Support Team", "INFO", "alloc_msg");
                    } else if (projectType === 121180002) {
                        formContext.ui.setFormNotification("Assigning to: Research and Development Team", "INFO", "alloc_msg");
                    } else if (projectType === 121180000) {
                        formContext.ui.setFormNotification("Assigning to: Internal Team", "INFO", "alloc_msg");
                    } else {
                        formContext.ui.setFormNotification("Insufficient resources. Please contact the Resource Management team.", "WARNING", "alloc_msg");
                    }

                    // --- 2. COMPLETION PERCENTAGE LOGIC ---
                    const completionAttr = formContext.getAttribute("bh_completionpercentage");
                    const completionControl = formContext.getControl("bh_completionpercentage") as Xrm.Controls.StandardControl;

                    if (status === 121180000) { // New
                        completionAttr!.setValue(0);
                        completionControl!.setDisabled(true);
                    } else if (status === 121180002) { // In Progress
                        completionControl!.setDisabled(false);
                        // Manual updates allowed 1% to 99% logic can be added here if needed
                    } else if (status === 121180004) { // Completed
                        completionAttr!.setValue(100);
                        completionControl!.setDisabled(true);
                    }
                }

                /**
                 * Requirement: Team Leader Assignment (OnSave)
                 * Prevents record saving if Team Leader is missing for Client projects
                 */
                public static onSave(context: Xrm.Events.SaveEventContext): void {
                    const formContext = context.getFormContext();
                    const projectType = formContext.getAttribute("bh_projecttype")!.getValue();
                    const teamLeader = formContext.getAttribute("bh_teamleader")!.getValue();

                    // If Client Project and no Team Leader assigned
                    if (projectType === 121180001 && !teamLeader) {
                        const alertOptions = { 
                            message: "A Team Leader must be assigned before starting the project and prevent record form saving.", 
                            title: "Missing Team Leader" 
                        };
                        Xrm.Navigation.openErrorDialog(alertOptions);

                        // Cancel the save operation
                        context.getEventArgs().preventDefault();
                    }
                }
            }
        }
 
(window as any).BH = BH;