sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"cadastralMaintenance/view/BaseController",
	"cadastralMaintenance/formatter/Formatter",
	"sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel) {
	"use strict";

	return BaseController.extend("cadastralMaintenance.view.DetailPayrollLoan", {
		onInit: function () {

			this.getView().setModel(new sap.ui.model.json.JSONModel(), "ET_SCREEN");
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

			this.fSearchHelps();

		},

		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			// var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
			var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);

			function fSuccess(oEvent) {

				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);

				if (that.getView().getModel("ET_HEADER").getData().BUKRS != "NEO") {
					that.getView().byId("lblMargem").setVisible(false);
					that.getView().byId("ipMargem").setVisible(false);
					
				}

				if (oGlobalData.IM_LOGGED_IN === 0) {
					that.getView().byId("lblBank").setVisible(true);
					that.getView().byId("cbBank").setVisible(true);
					that.getView().byId("btnForms").setVisible(true);
					that.getView().setModel(new sap.ui.model.json.JSONModel({
						MARGEM: oEvent.BLOCK.MARGEM
					}), "ET_BLOCK");
					
					
					if(parseFloat(oEvent.BLOCK.MARGEM) <= 0 && that.getView().getModel("ET_HEADER").getData().BUKRS == "NEO"){
						that.fUnableAllButtons();
						that.fUnableFields();
						MessageBox.error("Não existe margem consignável.");
					}
					
					return;
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
					var data = oEvent.BLOCK.BEGDA;
					var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
					that.getView().byId("dtBegda").setValue(dataF);
					that.preenchimentoAutomatico();

					that.getView().byId("lblBank2").setVisible(true);
					that.getView().byId("ipBank").setVisible(true);

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
				that.fSetGlobalInformation(oEvent, that);
				that.fVerifyAction();
				that.fGetLog();
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
					that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BDV");
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
			oModel.read("ET_PAYROLL_LOAN" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fUnableFields
		//	--------------------------------------------		
		fUnableFields: function () {
			var oView = this.getView();
			oView.byId("UploadCollection").setUploadButtonInvisible(true);
			oView.byId("cbBank").setEnabled(false);
			oView.byId("ipAgency").setEnabled(false);
			oView.byId("ipLoanValue").setEnabled(false);
			oView.byId("ipPrestValue").setEnabled(false);
			oView.byId("ipNumPrest").setEnabled(false);
			oView.byId("dtBegda").setEnabled(false);
			oView.byId("dtEndda").setEnabled(false);
			oView.byId("taJust").setEnabled(false);
		},

		//	--------------------------------------------
		//	fUnableAllButtons
		//	--------------------------------------------			
		fUnableAllButtons: function () {
			var oView = this.getView();

			// oView.byId("btnSave").setEnabled(false);
			oView.byId("btnForms").setVisible(false);
			oView.byId("btnApprove").setVisible(false);
			oView.byId("btnAccept").setVisible(false);
			oView.byId("btnCancel").setVisible(false);
		},

		//	--------------------------------------------
		//	fValidInputFields
		//	--------------------------------------------		
		fValidInputFields: function () {
			// this.fObligatoryFields();

			// var ipLifeInsurancePlan = this.getView().byId("ipLifeInsurancePlan").getValue();
			// var ipInsuranceOpt = this.getView().byId("ipInsuranceOpt").getValue();

			// if (ipLifeInsurancePlan === "" && ipInsuranceOpt === "") {
			// 	return true;
			// } else if(ipLifeInsurancePlan === "" || ipInsuranceOpt === "") {
			// 	return true;
			// }

			// return false; 
		},
		fObligatoryFields: function () {

			var model = this.getView().getModel("ET_BLOCK").getData();
			var begda = this.getView().byId("dtBegda").getValue();
			var endda = this.getView().byId("dtEndda").getValue();

			if (model.BANCO == "" || model.AGENCIA == "" || begda == "" || endda == "" || parseFloat(model.BETRG) <= 0 || parseInt(model.NUM_PREST) <=
				0 || model.NUM_PREST == "" || model.BETRG == "" || parseFloat(model.BETRG_PREST) <= 0 || model.BANCO == undefined || model.AGENCIA ==
				undefined || begda == undefined || endda == undefined || model.BETRG == undefined || model.NUM_PREST == undefined || model.NUM_PREST ==
				undefined || model.BETRG == undefined || model.BETRG_PREST == undefined) {

				this.handleErrorMessageBoxPress();
				return false;
			} else {
				return true;
			}
		},
		// --------------------------------------------
		// fFillCreatePayrollLoanData
		// -------------------------------------------- 		
		fFillCreatePayrollLoanData: function (oCreate, that) {
			var oActualModel = that.getView().getModel("ET_BLOCK").getData();
			var data = that.getView().byId("dtBegda").getValue();

			oCreate.BLOCK.ACTIO = "INS";
			oCreate.BLOCK.BANCO = this.getView().byId("cbBank").getValue();
			oCreate.BLOCK.AGENCIA = oActualModel.AGENCIA;
			oCreate.BLOCK.BEGDA = data.substring(6, 10) + data.substring(3, 5) + data.substring(0, 2);
			oCreate.BLOCK.BETRG = oActualModel.BETRG;
			oCreate.BLOCK.NUM_PREST = oActualModel.NUM_PREST;

			if (oActualModel.MARGEM == undefined) {
				oCreate.BLOCK.MARGEM = oActualModel.MARGEM;
			} else {
				oCreate.BLOCK.MARGEM = "";
			}

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

			that.fFillCreatePayrollLoanData(oCreate, that);

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
			oModel.create("ET_PAYROLL_LOAN", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {

			var margem = this.validMargem();

			if (margem === false) {
				return;
			}

			var obligatory = this.fObligatoryFields();
			if (obligatory === false) {
				return;
			}

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
			var caracteristica = "FORMULARIOEMPREST";

			if (req == '00000000') {
				return;
			}

			// FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
			var dados = filename + ";BDV;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;

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
				this.getAttachment(req, "BDV");
			}
		},

		onChange: function (oEvent) {
			// this.fVerifyChange(this);
		},
		onFormulario: function () {

			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_EMPR_CONSIG_SRV/");

			function fSuccess(oEvent) {
				window.open(oEvent.results[0].LinkPdf);
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

			var obligatory = this.fObligatoryFields();
			if (obligatory === false) {
				return;
			}

			var model = this.getView().getModel("ET_BLOCK").getData();
			var begda = this.getView().byId("dtBegda").getValue();
			var endda = this.getView().byId("dtEndda").getValue();

			var IvBanco = model.BANCO;
			var IvAgencia = model.AGENCIA;
			var IvValEmp = model.BETRG;
			var IvNumPre = model.NUM_PREST;
			var IvVencP = begda.substring(6, 10) + begda.substring(3, 5);
			var IvVencU = endda.substring(6, 10) + endda.substring(3, 5);
			var IvMargem = model.MARGEM;

			var url = "?$filter=IvBanco eq '" + IvBanco + "' and IvAgencia eq '" + IvAgencia + "' and IvValEmp eq '" + IvValEmp +
				"' and IvNumPre eq '" + IvNumPre + "' and IvVencP eq '" + IvVencP + "' and IvVencU eq '" + IvVencU + "' and IvMargem eq '" + IvMargem + "'";
			//MAIN READ
			oModel.read("EmprConsigSet" + url, null, null, false, fSuccess, fError);

		},
		fSearchHelps: function () {
			var that = this;
			var oEntry = [];
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oGlobalModel = this.getView().getModel("ET_GLOBAL_DATA");
			var urlParam = null;
			
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalModel.IM_BUKRS);

			this.Banks = new JSONModel();
			this.Banks.setData({
				table: []
			});

			function fSuccess(oEvent) {
				for (var i = 0; i < oEvent.results.length; i++) {
					oEntry = {
						key: oEvent.results[i].ID,
						desc: oEvent.results[i].TEXT
					};
					that.Banks.getData().table.push(oEntry);

					oEntry = [];
				}
				//Seta Lista no Model da View	
				that.getView().setModel(that.Banks, "banks"); 
				that.getView().byId("cbBank").setSelectedKey("1");

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

			oModel.read("ET_SH_BANK_LOAN", null, urlParam, false, fSuccess, fError);
		},
		onChangeValue: function (oEvent) {
			// this.fVerifyChange(this, oEvent.getSource().getValue());

		},
		onChangePrest:function(){
			var margem = this.validMargem();

			if (margem === false) {
				return;
			}	
		},
		preenchimentoAutomatico: function () {
			// var model = this.getView().getModel("ET_BLOCK").getData();
			// var screen = this.getView().getModel("ET_SCREEN");
			// var begda = this.getView().byId("dtBegda").getValue()
			// var screenData = screen.getData();

			// if (parseInt(model.NUM_PREST) > 0 && parseFloat(model.BETRG) > 0) {
			// 	screenData.BETRG_PREST = (parseFloat(model.BETRG) / parseFloat(model.NUM_PREST)).toFixed(2);
			// } else {
			// 	screenData.BETRG_PREST = "";
			// }
			// screen.setData(screenData);
			// this.getView().setModel(screen, "ET_SCREEN");

			// if (parseInt(model.NUM_PREST) > 0 && begda != "") {
			// 	var ano = begda.substring(6, 10);
			// 	var mes = parseInt(begda.substring(3, 5)) - 1;
			// 	var prest = model.NUM_PREST - 1;
			// 	this.getView().byId("dtEndda").setDateValue(new Date(ano, mes + prest));
			// } else {
			// 	this.getView().byId("dtEndda").setDateValue();
			// }

		},
		onChangeBank: function (oEvent) {
			var model = this.getView().getModel("ET_BLOCK");
			model.getData().BANCO = oEvent.getSource().getValue();
			this.getView().setModel(model, "ET_BLOCK");

			// this.fVerifyChange(this);
		},
		validMargem: function () {
			var block = this.getView().getModel("ET_BLOCK").getData();

			if (parseFloat(block.MARGEM) < parseFloat(block.BETRG_PREST)) {
				MessageBox.error("Valor da margem consignável é inferior ao valor da prestação");
				return false;
			} else {
				return true;

			}

		}

	});

});