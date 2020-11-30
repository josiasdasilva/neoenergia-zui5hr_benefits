sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"cadastralMaintenance/view/BaseController",
	"cadastralMaintenance/formatter/Formatter",
	"sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel) {
	"use strict";

	return BaseController.extend("cadastralMaintenance.view.DetailLifeInsurance", {
		onInit: function () {
			this.exclude = false;
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();

			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				var oEventBus = this.getEventBus();
				// oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
			}
			this.initAttachment();

			this.getRouter().attachRouteMatched(this.onRouteMatched, this);

			this.fSetHeader();
			this.fSetGlobalInformation();

			this.fGetBlock();
		},

		//  --------------------------------------------
		//  fGetBlock
		//  --------------------------------------------
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			// var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
			var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
				that.getView().setModel(oValue, "ET_BLOCK");

				if (oValue.oData.BPLAN === "") {
					that.getView().byId("btnLifeInsuranceExclude").setVisible(false);
				}

				//Isolates the model
				var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
				that.getView().setModel(oDataOrig, "ET_BLOCK_ORIG");

				that.fControlAttributesFields("ipLifeInsurancePlan", "ipInsuranceOpt");
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
					that.getView().byId("btnForms").setVisible(false);

					// Update list binding
					// that.getView().byId("upldAttachments").getBinding("items").filter(filters);
				} else {
					var plan = that.getView().byId("ipInsuranceOpt").getValue();
					that.setForm(plan);
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
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
					that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BDV");
					if (oEvent.BLOCK.ACTIO === "DEL") {
						that.getView().byId("btnLifeInsuranceExclude").setVisible(true);
						that.getView().byId("btnLifeInsuranceExclude").setEnabled(false);
					}
				}
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find('message').first().text();
				that.fControlAttributesFields("ipLifeInsurancePlan", "ipInsuranceOpt");

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
			oModel.read("ET_LIFE_INSURANCE" + urlParam, null, null, false, fSuccess, fError);
		},

		setForm: function (plan) {

			if (this.getView().getModel("ET_HEADER").getData().BUKRS === "NEO") {
				if (plan === "0001" ||
					plan === "1") {
					this.getView().byId("btnForms").setVisible(true);
				} else {
					this.getView().byId("btnForms").setVisible(false);
				}
			}

		},

		//  --------------------------------------------
		//  fUnableFields
		//  --------------------------------------------
		fUnableFields: function () {
			var oView = this.getView();

			oView.byId("UploadCollection").setUploadButtonInvisible(true);
			oView.byId("ipLifeInsurancePlan").setEnabled(false);
			oView.byId("ipInsuranceOpt").setEnabled(false);
			oView.byId("btnLifeInsuranceExclude").setVisible(false);
			oView.byId("taJust").setEnabled(false);
		},

		//  --------------------------------------------
		//  fUnableAllButtons
		//  --------------------------------------------
		fUnableAllButtons: function () {
			var oView = this.getView();
			// oView.byId("btnSave").setEnabled(false);
			oView.byId("btnForms").setVisible(false);
			oView.byId("btnApprove").setVisible(false);
			oView.byId("btnAccept").setVisible(false);
			oView.byId("btnCancel").setVisible(false);
		},

		//  --------------------------------------------
		//  fVerifyChange
		//  --------------------------------------------
		fVerifyChange: function (that) {
			// var currentModel = that.getView().getModel("ET_BLOCK");

			// if (currentModel.getData() !== undefined) {
			// 	currentModel = currentModel.getData();
			// 	var originalModel = that.getView().getModel("ET_BLOCK_ORIG");

			// 	if (currentModel.BPLAN !== originalModel.BPLAN ||
			// 		currentModel.BCOVR !== originalModel.BCOVR) {

			// 		that.getView().byId("btnAccept").setEnabled(true);
			// 	} else {
			// 		that.getView().byId("btnAccept").setEnabled(false);
			// 	}
			// }
		},

		//  --------------------------------------------
		//  fSearchHelps
		//  --------------------------------------------
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oBlock = this.getView().getModel("ET_BLOCK");

			//this.fSetSearchHelpValue(oModel, "ET_SH_LIFE_ASSURANCE_PLAN");
			this.fSearchHelpLifeAssurance();
			this.fSearchHelpLifeAssurancePlan();

			if (oBlock !== undefined) {
				var aBlock = oBlock.getData();

				if (aBlock !== undefined) {
					//Get Text Descriptions
					this.fGetDescription("ET_SH_LIFE_ASSURANCE_PLAN", "txtLifeInsurancePlan", aBlock.BPLAN, "BPLAN", "LTEXT", this);
					this.fGetDescription("ET_SH_LIFE_ASSURANCE", "txtInsuranceOpt", aBlock.BCOVR, "BCOVR", "LTEXT", this);
				}
			}

		},

		//--------------------------------------------
		//  fHelpRequest
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

					oScreenKeyField.setValue(aTokens[0].getProperty("key"));

					var selectedKey = "(" + aTokens[0].getProperty("key") + ")";
					var selectedDes = aTokens[0].getProperty("text").replace(selectedKey, "");
					oScreenTextField.setText(selectedDes);

					if (screenKeyField === "ipLifeInsurancePlan") {
						that.getView().byId("ipInsuranceOpt").setEnabled(true);
						that.getView().byId("ipInsuranceOpt").setValue("");
						that.getView().byId("txtInsuranceOpt").setText("");
					}

					that.fVerifyChange(that);
					that.fControlAttributesFields("ipLifeInsurancePlan", "ipInsuranceOpt");

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

		//  --------------------------------------------
		//  onHelpRequestLifeInsurancePlan
		//  --------------------------------------------
		onHelpRequestLifeInsurancePlan: function () {
			var cols = [{
				label: "Plano",
				template: "BPLAN"
			}, {
				label: "Denominação",
				template: "LTEXT"
			}];

			this.fHelpRequest("BPLAN", "LTEXT", cols, "ET_SH_LIFE_ASSURANCE_PLAN", this, "Plano de Seguro",
				"ipLifeInsurancePlan", "txtLifeInsurancePlan");
		},

		//  --------------------------------------------
		//  onHelpRequestInsuranceOpt
		//  --------------------------------------------
		onHelpRequestInsuranceOpt: function () {
			var cols = [{
				label: "Área de Benefícios Compl.",
				template: "BAREA"
			}, {
				label: "Plano",
				template: "BPLAN"
			}, {
				label: "Benefícios Compl. Opção de Seguro",
				template: "BCOVR"
			}, {
				label: "Denominação",
				template: "LTEXT"
			}];

			this.fSearchHelpLifeAssurance();

			this.fHelpRequest("BCOVR", "LTEXT", cols, "ET_SH_LIFE_ASSURANCE", this, "Opção de Seguro",
				"ipInsuranceOpt", "txtInsuranceOpt");
		},

		//  --------------------------------------------
		//  fSearchHelpLifeAssurance
		//  --------------------------------------------
		fSearchHelpLifeAssurance: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oGlobalModel = this.getView().getModel("ET_GLOBAL_DATA");

			var urlParam = "";
			//var ipLifeInsurancePlan = this.getView().byId("ipLifeInsurancePlan").getValue();
			//urlParam = this.fFillURLFilterParam("IM_BPLAN", ipLifeInsurancePlan);

			var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
			urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalModel.IM_BUKRS, urlParam);

			this.fSetSearchHelpValue(oModel, "ET_SH_LIFE_ASSURANCE", urlParam);
		},

		//  --------------------------------------------
		//  fSearchHelpLifeAssurancePlan
		//  --------------------------------------------
		fSearchHelpLifeAssurancePlan: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oGlobalModel = this.getView().getModel("ET_GLOBAL_DATA");

			var urlParam = "";
			//var ipLifeInsurancePlan = this.getView().byId("ipLifeInsurancePlan").getValue();
			//urlParam = this.fFillURLFilterParam("IM_BPLAN", ipLifeInsurancePlan);

			var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
			urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalModel.IM_BUKRS, urlParam);

			this.fSetSearchHelpValue(oModel, "ET_SH_LIFE_ASSURANCE_PLAN", urlParam);
		},
		//  --------------------------------------------
		//  fValidInputFields
		//  --------------------------------------------
		fValidInputFields: function () {

			var ipLifeInsurancePlan = this.getView().byId("ipLifeInsurancePlan").getValue();
			var ipInsuranceOpt = this.getView().byId("ipInsuranceOpt").getValue();

			if (ipLifeInsurancePlan === "" && ipInsuranceOpt === "") {

				if (this.cancelLifeInsurance === true) {
					return false;
				} else {
					return true;
				}
			} else if (ipLifeInsurancePlan === "" || ipInsuranceOpt === "") {
				return true;
			}

			return false;
		},

		//  --------------------------------------------
		//  fObligatoryFields
		//  --------------------------------------------
		fObligatoryFields: function () {

			var model = this.getView().getModel("ET_BLOCK").getData();

			if (model.BPLAN == "" || model.BCOVR == undefined || model.BCOVR == "" || model.BPLAN == undefined) {
				return false;
			}
		},

		//  --------------------------------------------
		//  onCancelLifeInsurance
		//  --------------------------------------------
		onCancelLifeInsurance: function () {

			this.fUnableFields();
			this.getView().byId("btnCancel").setVisible(true);
			this.getView().byId("btnForms").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.exclude = true;
			// var oView = this.getView();

			// oView.byId("ipLifeInsurancePlan").setValue("");
			// oView.byId("ipInsuranceOpt").setValue("");
			// oView.byId("txtLifeInsurancePlan").setText("");
			// oView.byId("txtInsuranceOpt").setText("");
			// this.fMessage("None", null, "ipLifeInsurancePlan");
			// this.fMessage("None", null, "ipInsuranceOpt");

			// this.fVerifyChange(this);

			// this.fControlAttributesFields("ipLifeInsurancePlan", "ipInsuranceOpt");
			this.cancelLifeInsurance = true;
		},

		// --------------------------------------------
		// fFillCreateLifeInsuranceData
		// --------------------------------------------
		fFillCreateLifeInsuranceData: function (oCreate, that) {
			var oActualModel = that.getView().getModel("ET_BLOCK").getData();
			var oOrigModel = that.getView().getModel("ET_BLOCK_ORIG");

			oCreate.BLOCK.ACTIO = "";

			if (this.exclude === true || oCreate.BLOCK.ACTIO == "DEL") {

				oCreate.BLOCK.ACTIO = "DEL";
				oActualModel.BPLAN = "";
				oActualModel.BCOVR = "";
			} else {

				if (oActualModel.BPLAN !== oOrigModel.BPLAN ||
					oActualModel.BCOVR !== oOrigModel.BCOVR) {

					oCreate.BLOCK.ACTIO = "INS";
				}
			}

			oCreate.BLOCK.BPLAN = oActualModel.BPLAN;
			oCreate.BLOCK.BCOVR = oActualModel.BCOVR;
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
			oCreate.IM_BUKRS = oGlobalData.IM_BUKRS;
			oCreate.OBSERVATION = that.getView().byId("taJust").getValue();

			if (oCreate.IM_LOGGED_IN == 5) {
				oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
			}

			that.fFillCreateLifeInsuranceData(oCreate, that);

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
				case "A":
					MessageBox.success("Aprovação realizada com sucesso!");
					that.fVerifyAction(false, "A");
					break;

				case "S":
					that.fSucessMessageFromSendAction(oEvent);
					that.fVerifyAction(false, "S");
					that.saveAttachment();
					break;

				case "C":
					MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

					that.fGetBlock();

					var oUploadCollection = that.getView().byId("UploadCollection");
					oUploadCollection.destroyItems();
					that.fVerifyAction(false, "C");
					break;

				case "R":
					MessageBox.success(
						"Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
					);

					that.fSetGlobalInformation(oEvent, that);
					that.fVerifyAction(false, "R");

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
			oModel.create("ET_LIFE_INSURANCE", oCreate, null, fSuccess, fError);
		},

		onFormulario: function () {

			var sServiceUrl = "/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/";
			var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
			var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
			var vPlan = "";

			var oblig = this.fObligatoryFields();

			if (oblig === false) {
				this.handleErrorMessageBoxPress();
				return;
			}

			vPlan = "SVGR"; //this.getView().byId("ipLifeInsurancePlan").getValue();

			//var sRead = "/ET_FORMS(FORMNAME='SEGUROVIDA',PERNR='" + pernr + "',VPLAN='" + vPlan + "',BUKRS='" + empresa + "')";
			var sRead = "/ET_FORMS(FORMNAME='SEGUROVIDA',PERNR='" + pernr + "',TYPE='" + vPlan + "',OPERATION='" + vPlan + "',COMPLEMENTS='" +
				empresa + "')";
			var pdfURL = sServiceUrl + sRead + "/$value";
			window.open(pdfURL);

		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {
			debugger;
			// var validFields = this.fValidInputFields();

			// if (validFields === true) {
			// 	this.handleErrorMessageBoxPress();
			// 	return;
			// }

			if (this.getView().getModel("ET_HEADER").getData().BUKRS == "NEO") {
				var oblig = this.fObligatoryFields();

				if (oblig === false && this.exclude === false) {
					this.handleErrorMessageBoxPress();
					return;
				}
			}

			if (this.exclude === false || this.exclude == undefined) {
				var valid = this.validAttachment();

				if (valid === false) {
					return;
				}
			}

			this.fActions(this, "envio", "S");

		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onApprove: function () {
			this.fActions(this, "aprovar", "A");
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

			if (this.exclude === false || this.exclude === undefined) {
				if (this.getView().byId("taJustSSG").getValue() === "") {
					this.handleErrorMessageBoxDisapprove();
					return;
				}
				this.fActions(this, "cancelamento", "C");
			} else {
				this.fOpenFields();
				this.exclue = false;
				this.getView().byId("btnCancel").setVisible(false);
				this.getView().byId("btnLifeInsuranceExclude").setVisible(true);
				
				if(this.getView().getModel("ET_HEADER").getData().BUKRS === "NEO"){
					this.getView().byId("btnForms").setVisible(true);
				}
			}

		},

		// --------------------------------------------
		// onPressQuickView
		// -------------------------------------------- 
		onPressQuickView: function () {
			this._Dialog = sap.ui.xmlfragment("cadastralMaintenance.helpTextFiles.QuickViewHelpInsurance", this);
			this._Dialog.open();
		},

		// --------------------------------------------
		// onPressQuickView2
		// -------------------------------------------- 
		onPressQuickView2: function () {
			this._Dialog = sap.ui.xmlfragment("cadastralMaintenance.helpTextFiles.QuickViewHelpInsurance2", this);
			this._Dialog.open();
		},

		// --------------------------------------------
		// onClose
		// -------------------------------------------- 
		onClose: function () {
			this._Dialog.close();
		},

		onBeforeUpload: function (oEvent) {

			var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
			var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
			var filename = oEvent.getParameter("fileName");

			if (req == '00000000') {
				return;
			}

			// FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
			var dados = filename + ";BDV;" + req + ";INSERT;" + "DPSSEGURO;" + "S" + ";" + pernr;

			oEvent.getParameters().addHeaderParameter(new sap.m.UploadCollectionParameter({
				name: "slug",
				value: dados
			}));

		},
		onUploadAttComplete: function (oEvent) {
			if (oEvent.mParameters.mParameters.status !== 201) {
				MessageBox.error("Falha ao Salvar Arquivo ..!!");
			} else {
				var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
				debugger;
				this.getAttachment(req, "BDV");
			}
		},

		//	--------------------------------------------
		//	fOpenFields
		//	--------------------------------------------		
		fOpenFields: function () {
			var oView = this.getView();
			oView.byId("UploadCollection").setUploadButtonInvisible(false);
			oView.byId("ipLifeInsurancePlan").setEnabled(true);
			oView.byId("ipInsuranceOpt").setEnabled(true);

		},

	});

});