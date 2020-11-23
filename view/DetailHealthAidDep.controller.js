sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"cadastralMaintenance/view/BaseController",
	"cadastralMaintenance/formatter/Formatter",
	"sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel) {
	"use strict";

	return BaseController.extend("cadastralMaintenance.view.DetailHealthAidDep", {
		onInit: function () {
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

		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			this.getDependents();

			var oModelDep = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			this.fSetSearchHelpValue(oModelDep, "ET_SH_DEPENDENTS");

			if (oGlobalData.IM_LOGGED_IN === 0) {
				this.getView().setModel(new sap.ui.model.json.JSONModel(), "ET_BLOCK");
				return;
			}

			var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);

				if (parseFloat(oEvent.BLOCK.VALUE_APPR) <= 0) {
					oEvent.BLOCK.VALUE_APPR = oEvent.BLOCK.VALUE;
				}

				that.getView().setModel(oValue, "ET_BLOCK");

				//Isolates the model
				var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
				that.getView().setModel(oDataOrig, "ET_BLOCK_ORIG");

				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);

				if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}

				// se tem id verificar os anexos
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
					var data = oEvent.BLOCK.DATA;
					var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
					that.getView().byId("dtPeriod").setValue(dataF);

					that.getView().byId("lblApprovedValue").setVisible(true);
					that.getView().byId("ipApprovedValue").setVisible(true);

					var filters = [];

					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];

					that.getView().setModel(oModel, "anexo");

					// Update list binding
					// that.getView().byId("upldAttachments").getBinding("items").filter(filters);
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
				that.fSearchHelps(that, that.getView().getModel("ET_HEADER").getData().PERNR);
				that.fSetGlobalInformation(oEvent, that);
				that.fVerifyAction();
				that.fGetLog();
				that.fChangeForms(that);
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
					that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BSS");
				}

			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find('message').first().text();

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
			oModel.read("ET_HEALTH_AID_DEP" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fUnableFields
		//	--------------------------------------------		
		fUnableFields: function () {
			var oView = this.getView();

			oView.byId("cbTypeBenefit").setEnabled(false);
			oView.byId("ipRequestedValue").setEnabled(false);
			oView.byId("dtPeriod").setEnabled(false);
			oView.byId("taJust").setEnabled(false);
		},
		fChangeForms: function (that) {
			that.getView().byId("formHealthAidDep").setVisible(true);
			that.getView().byId("formDependents").setVisible(false);
		},

		//	--------------------------------------------
		//	fUnableAllButtons
		//	--------------------------------------------			
		fUnableAllButtons: function () {
			var oView = this.getView();

			// oView.byId("btnSave").setEnabled(false);
			oView.byId("btnApprove").setVisible(false);
			oView.byId("btnAccept").setVisible(false);
			oView.byId("btnCancel").setVisible(false);
		},

		//	--------------------------------------------
		//	fVerifyChange
		//	--------------------------------------------		
		fVerifyChange: function (that) {
			var oData = that.getView().getModel("ET_BLOCK").getData();
			var date = this.getView().byId("dtPeriod").getValue();

			if (oData.TYPE !== "" && oData.VALUE !== "0.0" && date !== "") {
				that.getView().byId("btnAccept").setEnabled(true);
			} else {
				that.getView().byId("btnAccept").setEnabled(false);
			}
		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function (that, pernr, TYPE_DEPEN) {
			var oEntry = [];
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var urlParam = null;

			that.Benef = new JSONModel();
			that.Benef.setData({
				table: []
			});

			if (pernr !== undefined && pernr !== null && pernr !== "") {
				urlParam = this.fFillURLFilterParam("PERNR", pernr);
			}

			if (TYPE_DEPEN !== undefined && TYPE_DEPEN !== null && TYPE_DEPEN !== "") {
				urlParam = this.fFillURLParamFilter("TYPE_DEPEN", TYPE_DEPEN, urlParam);
			}

			function fSuccess(oEvent) {

				for (var i = 0; i < oEvent.results.length; i++) {
					oEntry = {
						key: oEvent.results[i].TYPE,
						desc: oEvent.results[i].TEXT
					};
					that.Benef.getData().table.push(oEntry);

					oEntry = [];
				}
				//Seta Lista no Model da View	
				that.getView().setModel(that.Benef, "benef");
				
				if(TYPE_DEPEN != undefined && TYPE_DEPEN != "" && TYPE_DEPEN !== null){
					if (oEvent.results.length > 0) {
						that.getView().byId("formHealthAidDep").setVisible(true);
					} else{
						that.getView().byId("formHealthAidDep").setVisible(false);
						MessageBox.error("Benefício não elegível para dependente");
					} 
				}
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find('message').first().text();

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

			oModel.read("ET_SH_HEALTH_AID_TYPE", null, urlParam, false, fSuccess, fError);
		},
		// --------------------------------------------
		// fFillCreateHealthAidData
		// -------------------------------------------- 		
		fFillCreateHealthAidData: function (oCreate, that) {
			var oActualModel = that.getView().getModel("ET_BLOCK").getData();
			var data = that.getView().byId("dtPeriod").getValue();

			oCreate.BLOCK.ACTIO = "INS";
			oCreate.BLOCK.TYPE_DEPEN = oActualModel.TYPE_DEPEN;
			oCreate.BLOCK.OBJPS = oActualModel.OBJPS;
			oCreate.BLOCK.FCNAM = oActualModel.FCNAM;
			oCreate.BLOCK.TYPE = oActualModel.TYPE;
			oCreate.BLOCK.VALUE = oActualModel.VALUE;
			oCreate.BLOCK.VALUE_APPR = oActualModel.VALUE_APPR;
			oCreate.BLOCK.DATA = data.substring(6, 10) + data.substring(3, 5) + data.substring(0, 2);

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

			that.fFillCreateHealthAidData(oCreate, that);

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
			oModel.create("ET_HEALTH_AID_DEP", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {

			var valid = this.validAttachment();

			if (valid === false) {
				return;
			}

			// if (this.fValidInputFields() === false) {
			this.fActions(this, "envio", "S");
			// } else {
			// 	this.handleErrorMessageBoxPress();
			// }

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

			if (this.getView().byId("taJustSSG").getValue() === "") {
				this.handleErrorMessageBoxDisapprove();
				return;
			}

			this.fActions(this, "cancelamento", "C");
		},

		// --------------------------------------------
		// onPressQuickView
		// -------------------------------------------- 
		onPressQuickView: function () {
			this._Dialog = sap.ui.xmlfragment("cadastralMaintenance.helpTextFiles.QuickViewHelpInsurance", this);
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
			var type = this.getView().getModel("ET_BLOCK").getData().TYPE;
			var caracteristica;

			if (req == '00000000') {
				return;
			}

			switch (type) {
			case 'PFPD':
				caracteristica = "FORMULARIOCOMPRDEF";
				break;
			case 'OTIC':
				caracteristica = "FORMULARIOCOMPROCOD";
				break;
			case 'ORTO':
				caracteristica = "FORMULARIOCOMPROCOD";
				break;
			case 'AXPS':
				caracteristica = "FORMULARIOCOMPRASPS";
				break;
			}

			// FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
			var dados = filename + ";BSS;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;

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
				this.getAttachment(req, "BSS");
			}
		},

		onChange: function (oEvent) {
			this.fVerifyChange(this);
		},
		getDependents: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			function fSuccess(oEvent) {
				if (oEvent.results.length <= 0) {
					return;
				}
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results[0].DEPENDENTS);
				that.getView().setModel(oValue, "ET_DEPENDENTS");
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find("message").first().text();
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
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oGlobalData.IM_PERNR);
			urlParam = this.fFillURLParamFilter("IM_REQUISITION_ID", oGlobalData.IM_REQ_URL, urlParam);
			urlParam = this.fFillURLParamFilter("IM_LOGGED_IN", oGlobalData.IM_LOGGED_IN, urlParam);
			urlParam = urlParam + "&$expand=DEPENDENTS";
			oModel.read("ET_DEPENDENTS", null, urlParam, false, fSuccess, fError);

		},
		onDependentRowSelectionChange: function (oEvent) {
			var selectedRow = this.fGetSelectedRowDetail();
			this.fFillDependentDetail(selectedRow);
			this.fSearchHelps(this, this.getView().getModel("ET_HEADER").getData().PERNR, selectedRow.SUBTY);
			
			var model = this.getView().getModel("ET_BLOCK");
			model.getData().OBJPS = selectedRow.OBJPS;
			model.getData().FCNAM = selectedRow.FCNAM;
			model.getData().TYPE = "";
			model.getData().VALUE = "";
			model.getData().DATA = "";
			this.getView().byId("dtPeriod").setValue();
			this.getView().setModel(model, "ET_BLOCK");
		},
		//--------------------------------------------
		//	fGetSelectedRowDetail
		//--------------------------------------------		
		fGetSelectedRowDetail: function () {
			var oTable = this.getView().byId("tDependents");
			var selectedIndex = oTable.getSelectedIndex();
			var oTableModel = this.getView().byId("tDependents").getModel("ET_DEPENDENTS");
			var completeRows = oTableModel.getData();
			return completeRows.results[selectedIndex];
		},
		fFillDependentDetail: function (selectedRow) {
			var oView = this.getView();
			oView.byId("ipDependentFullName").setValue(selectedRow.FCNAM);
			oView.byId("slMemberType").setSelectedKey(selectedRow.SUBTY);
		}

	});

});