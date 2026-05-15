"use strict";
/// <reference types="xrm" />
var IKL;
(function (IKL) {
    class CustRibbons {
        static async generateEmail(primaryControl) {
            const formContext = primaryControl;
            const AccountName = formContext.getAttribute("name")?.getValue();
            const AccountID = formContext.data.entity.getId();
            const confirmStrings = {
                title: "Confirmation",
                text: "Do you want to generate the welcome email?",
                confirmButtonLabel: "Confirm",
                cancelButtonLabel: "Cancel"
            };
            const confirmOption = {
                height: 200,
                width: 450
            };
            const result = await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOption);
            if (result.confirmed) {
                Xrm.Navigation.openAlertDialog({
                    title: "Account Details",
                    text: `Account Name: ${AccountName}
Account ID: ${AccountID}`
                });
            }
        }
        static onBulkUpdate(primaryControl) {
            const selectedRows = primaryControl.getGrid().getSelectedRows();
            let ids = [];
            selectedRows.forEach((row) => {
                const id = row.getData().getEntity().getId();
                ids.push(id);
            });
            Xrm.Navigation.openAlertDialog({
                title: "Selected Account ID's",
                text: ids.join("\n")
            });
        }
    }
    IKL.CustRibbons = CustRibbons;
})(IKL || (IKL = {}));
