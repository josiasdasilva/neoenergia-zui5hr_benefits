sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"cadastralMaintenance/view/BaseController",
	"cadastralMaintenance/formatter/Formatter"
], function (Controller, ResourceModel, MessageBox, BaseController) {
	"use strict";

	return BaseController.extend("cadastralMaintenance.view.DetailSportAssociation", {
		onInit: function () {
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();

			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				var oEventBus = this.getEventBus();
				// oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
			}

			this.getRouter().attachRouteMatched(this.onRouteMatched, this);

			this.fSetHeader();
			this.fSetGlobalInformation();
			this.fGetBlock();
		},

		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);

				that.getView().setModel(oValue, "ET_BLOCK");

				if (oValue.oData.BPLAN === "") {
					that.getView().byId("btnSportiveAssExclude").setVisible(false);
				}

				//Isolates the model
				var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
				that.getView().setModel(oDataOrig, "ET_BLOCK_ORIG");

				that.fControlAttributesFields("ipSportsAssPlan", "ipSportsAssOpt");
				that.fSearchHelps();

				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);

				if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}

				// se tem id verificar os anexos
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {

					var filters = [];

					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];

					that.getView().setModel(oModel, "anexo");

					// Update list binding
					that.getView().byId("upldAttachments").getBinding("items").filter(filters);
				}

				if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A") {
					if ((oEvent.BLOCK.REQUISITION_ID !== null || oEvent.BLOCK.REQUISITION_ID !== "" || oEvent.BLOCK.REQUISITION_ID !== undefined) &
						oEvent.BLOCK.REQUISITION_ID !== "00000000") {

						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
						}

					}

				}
				that.fSetGlobalInformation(oEvent, that);
				that.fVerifyAction();
				that.fGetLog();
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find('message').first().text();
				that.fControlAttributesFields("ipSportsAssPlan", "ipSportsAssOpt");

				if (message.substring(2, 4) == "99") {
					var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
					var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
					var zMessage = formattedDetail.replace("error", "");

					that.fVerifyAllowedUser(message, that);
					MessageBox.error(zMessage);

				} else {
					MessageBox.error(message);
				}
			}

			//MAIN READ
			oModel.read("ET_SPORT_ASSOCIATION" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fVerifyChange
		//	--------------------------------------------		
		fVerifyChange: function (that) {
			var currentModel = that.getView().getModel("ET_BLOCK");

			if (currentModel.getData() !== undefined) {
				currentModel = currentModel.getData();
				var originalModel = that.getView().getModel("ET_BLOCK_ORIG");

				if (currentModel.BPLAN !== originalModel.BPLAN ||
					currentModel.LEVL1 !== originalModel.LEVL1) {

					that.getView().byId("btnAccept").setEnabled(true);
				} else {
					that.getView().byId("btnAccept").setEnabled(false);
				}
			}
		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oBlock = this.getView().getModel("ET_BLOCK");

			var urlParam = "";
			urlParam = this.fFillURLFilterParam("IM_PLTYP", "BRGR");

			this.fSetSearchHelpValue(oModel, "ET_SH_OTHERS_BENEFITS", urlParam);

			this.fSearchHelpSportsAssOpt();

			if (oBlock !== undefined) {
				var aBlock = oBlock.getData();

				if (aBlock !== undefined) {
					//Get Text Descriptions
					this.fGetDescription("ET_SH_OTHERS_BENEFITS", "txtSportsAssPlan", aBlock.BPLAN, "BPLAN", "LTEXT", this);
					this.fGetDescription("ET_SH_OTHERS_BENEFITS_OPT", "txtSportsAssOpt", aBlock.LEVL1, "LEVL1", "LTEXT", this);
				}
			}

		},

		//	--------------------------------------------
		//	fSearchHelpSportsAssOpt
		//	--------------------------------------------		
		fSearchHelpSportsAssOpt: function () {
			var ipSportsAssPlan = this.getView().byId("ipSportsAssPlan").getValue();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");

			var urlParam = "";
			urlParam = this.fFillURLFilterParam("IM_BPLAN", ipSportsAssPlan);

			this.fSetSearchHelpValue(oModel, "ET_SH_OTHERS_BENEFITS_OPT", urlParam);
		},

		//--------------------------------------------
		//	fHelpRequest
		//--------------------------------------------		
		fHelpRequest: function (key, descriptionKey, cols, modelName, that, title, screenKeyField, screenTextField) {
			var oScreenKeyField = this.getView().byId(screenKeyField);
			var oScreenTextField = this.getView().byId(screenTextField);

			that._oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				supportRanges: false,
				supportRangesOnly: false,
				supportMultiselect: false,
				key: key,
				descriptionKey: descriptionKey,

				ok: function (oEvent) {
					var aTokens = oEvent.getParameter("tokens");

					//Set values into others corresponding fiels in screen
					oScreenKeyField.setValue(aTokens[0].getProperty("key"));
					var selectedKey = "(" + aTokens[0].getProperty("key") + ")";
					var selectedDes = aTokens[0].getProperty("text").replace(selectedKey, "");
					oScreenTextField.setText(selectedDes);

					if (screenKeyField === "ipSportsAssPlan") {
						that.getView().byId("ipSportsAssOpt").setEnabled(true);
						that.getView().byId("ipSportsAssOpt").setValue("");
						that.getView().byId("txtSportsAssOpt").setText("");
					}

					that.fVerifyChange(that);
					that.fControlAttributesFields("ipSportsAssPlan", "ipSportsAssOpt");
					this.close();
				},
				cancel: function () {
					this.close();
				}
			});

			//Set columns to the Search Help creation 
			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setData({
				cols: cols
			});

			//Clear any messages it may have
			this.fMessage("None", null, screenKeyField);

			//Create the Search Help columns structure
			var oTable = this._oValueHelpDialog.getTable();
			oTable.setModel(oColModel, "columns");

			//Create contens (on test purpose) and bind it to the Search Help 
			var oModel = this.getView().getModel(modelName);
			oTable.setModel(oModel);
			oTable.bindRows("/");

			//Set title and open dialog
			that._oValueHelpDialog.setTitle(title);
			this._oValueHelpDialog.open();
		},

		//	--------------------------------------------
		//	onHelpRequestSportsAssPlan
		//	--------------------------------------------		
		onHelpRequestSportsAssPlan: function () {
			var cols = [{
				label: "Plano",
				template: "BPLAN"
			}, {
				label: "Denominação",
				template: "LTEXT"
			}];

			this.fHelpRequest("BPLAN", "LTEXT", cols, "ET_SH_OTHERS_BENEFITS", this, "Associação Esportiva - Plano",
				"ipSportsAssPlan", "txtSportsAssPlan");
		},

		//	--------------------------------------------
		//	onHelpRequestSportsAssOpt
		//	--------------------------------------------		
		onHelpRequestSportsAssOpt: function () {
			var cols = [{
				label: "Opção",
				template: "LEVL1"
			}, {
				label: "Denominação",
				template: "LTEXT"
			}];

			this.fSearchHelpSportsAssOpt();

			this.fHelpRequest("LEVL1", "LTEXT", cols, "ET_SH_OTHERS_BENEFITS_OPT", this, "Opção de Seguro",
				"ipSportsAssOpt", "txtSportsAssOpt");
		},

		//	--------------------------------------------
		//	fUnableFields
		//	--------------------------------------------		
		fUnableFields: function () {
			var oView = this.getView();

			oView.byId("btnSportiveAssExclude").setVisible(false);

			oView.byId("ipSportsAssPlan").setEnabled(false);
			oView.byId("ipSportsAssOpt").setEnabled(false);
			oView.byId("taJust").setEnabled(false);
		},

		//	--------------------------------------------
		//	fUnableAllButtons
		//	--------------------------------------------			
		fUnableAllButtons: function () {
			var oView = this.getView();

			oView.byId("btnSave").setEnabled(false);
			oView.byId("btnAccept").setEnabled(false);
			oView.byId("btnCancel").setEnabled(false);
		},

		//	--------------------------------------------
		//	onCancelSportAssociation
		//	--------------------------------------------		
		onCancelSportAssociation: function () {
			var oView = this.getView();

			oView.byId("ipSportsAssPlan").setValue("");
			oView.byId("ipSportsAssOpt").setValue("");
			oView.byId("txtSportsAssPlan").setText("");
			oView.byId("txtSportsAssOpt").setText("");
			this.fMessage("None", null, "ipSportsAssPlan");
			this.fMessage("None", null, "ipSportsAssOpt");

			this.fVerifyChange(this);

			this.fControlAttributesFields("ipSportsAssPlan", "ipSportsAssOpt");
		},

		//	--------------------------------------------
		//	fValidInputFields
		//	--------------------------------------------		
		fValidInputFields: function () {
			this.fObligatoryFields();

			var ipSportsAssPlan = this.fVerifyError("ipSportsAssPlan");
			var ipSportsAssOpt = this.fVerifyError("ipSportsAssOpt");

			if (ipSportsAssPlan === false && ipSportsAssOpt === false) {
				return false;
			} else {
				return true;
			}
		},

		//	--------------------------------------------
		//	fObligatoryFields
		//	--------------------------------------------
		fObligatoryFields: function () {
			var ipSportsAssPlan = this.getView().byId("ipSportsAssPlan").getValue();
			var ipSportsAssOpt = this.getView().byId("ipSportsAssOpt").getValue();

			if (ipSportsAssPlan.trim() === "" && ipSportsAssOpt.trim() !== "") {
				this.fValidationObligatoryFields("ipSportsAssPlan");
			}

			if (ipSportsAssPlan.trim() !== "" && ipSportsAssOpt.trim() === "") {
				this.fValidationObligatoryFields("ipSportsAssOpt");
			}
		},

		// --------------------------------------------
		// fFillCreateSportAssociationData
		// -------------------------------------------- 		
		fFillCreateSportAssociationData: function (oCreate, that) {
			var oActualModel = that.getView().getModel("ET_BLOCK").getData();
			var oOrigModel = that.getView().getModel("ET_BLOCK_ORIG");

			oCreate.BLOCK.ACTIO = "";

			if (oActualModel.BPLAN === "" && oActualModel.LEVL1 === "") {

				if (oOrigModel.BPLAN !== "" || oOrigModel.LEVL1 !== "") {
					oCreate.BLOCK.ACTIO = "DEL";
				}

			} else {

				if (oOrigModel.BPLAN === "" && oOrigModel.LEVL1 === "") {
					oCreate.BLOCK.ACTIO = "INS";
				} else {
					oCreate.BLOCK.ACTIO = "MOD";
				}
			}

			oCreate.BLOCK.BPLAN = oActualModel.BPLAN;
			oCreate.BLOCK.LEVL1 = oActualModel.LEVL1;
		},

		// --------------------------------------------
		// fCreateRequisition
		// -------------------------------------------- 
		fCreateRequisition: function (that, action) {
			var oCreate = {};
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			oCreate.BLOCK = {};

			oCreate.BLOCK.REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
			oCreate.IM_REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
			oCreate.IM_ACTION = action;
			oCreate.IM_LOGGED_IN = oGlobalData.IM_LOGGED_IN;
			oCreate.IM_PERNR = oGlobalData.IM_PERNR;
			oCreate.OBSERVATION = that.getView().byId("taJust").getValue();

			if (oCreate.IM_LOGGED_IN == 5) {
				oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
			}

			that.fFillCreateSportAssociationData(oCreate, that);

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
				case "S":
					that.fSucessMessageFromSendAction(oEvent);
					that.fVerifyAction(false, "S");
					// *** ANEXO ***
					that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					that.setDocumentStatus(oGlobalData.IM_REQUISITION_ID,action);
					break;

				case "C":
					MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

					that.fGetBlock();

					var oUploadCollection = that.getView().byId("upldAttachments");
					oUploadCollection.destroyItems();
					that.fVerifyAction(false, "C");
					// *** ANEXO ***
					that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					break;

				case "R":
					MessageBox.success(
						"Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
					);

					that.fSetGlobalInformation(oEvent, that);
					that.fVerifyAction(false, "R");

					// *** ANEXO ***
					that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);

					break;
				}
				that.fGetLog();
			}

			//ERRO
			function fError(oEvent) {
				oGlobalData.IM_REQUISITION_ID = that.fGetRequisitionId(oEvent);

				if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
					var message = $(oEvent.response.body).find("message").first().text();

					if (message === undefined || message === "" || message === " ") {
						message = "Erro inesperado. Favor contactar o administrador do sistema";
					}

					MessageBox.error(message);

				} else {
					var detail = $(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body);
					var formattedDetail = (detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", ""));
					formattedDetail = formattedDetail.replace("error", "");
					MessageBox.error(formattedDetail);

				}
			}

			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			oModel.create("ET_SPORT_ASSOCIATION", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {

			if (this.fValidInputFields() === false) {
				this.fActions(this, "envio", "S");
			} else {
				this.handleErrorMessageBoxPress();
			}

		},

		// --------------------------------------------
		// onSave
		// --------------------------------------------  
		onSave: function () {
			this.fActions(this, "gravação", "R");
		},

		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function () {
			this.fActions(this, "cancelamento", "C");
		}
	});

});