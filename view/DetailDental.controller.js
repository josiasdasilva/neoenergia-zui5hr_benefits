sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"cadastralMaintenance/view/BaseController",
	"cadastralMaintenance/formatter/Formatter"
], function (Controller, ResourceModel, MessageBox, BaseController) {
	"use strict";

	return BaseController.extend("cadastralMaintenance.view.DetailDental", {
		onInit: function () {
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();

			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				// var oEventBus = this.getEventBus();
				// oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
			}

			this.obligatoryChanged = false;

			this.initAttachment();
			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSetHeader();
			this.fSetGlobalInformation();
			this.fGetBlock();
			this.fCheckSaneaBtn("128");
		},

		onChangeOdonto: function (oEvent) {
			if (this.getView().getModel("ET_HEADER").getData().BUKRS != "NEO") {
				this.fCheckChangeElek("tOdonto");
			} else {
				this.fCheckChange("tOdonto");
			}

			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
			this.getView().byId("btnSanity").setVisible(false);
		},

		// onChangeHealth: function (oEvent) {
		// 	this.fCheckChange("tHealth");
		// 	this.getView().byId("btnAccept").setEnabled(true);
		// 	this.getView().byId("btnSave").setEnabled(true);
		// 	this.getView().byId("btnSanity").setVisible(false);
		// },

		fRemoveDependents: function (table) {
			var oModelDependents = this.getView().byId(table).getModel().getData();

			if (oModelDependents === null) {
				return;
			}

			for (var i = 0; i < oModelDependents.length; i++) {

				if (table === "tHealth") {
					oModelDependents[i].ACTIO_BRHE = "DEL";
					oModelDependents[i].ACTIVE_BRHE = "";

				} else {
					oModelDependents[i].ACTIO_BRDE = "DEL";
					oModelDependents[i].ACTIVE_BRDE = "";

				}

			}

			if (table === "tHealth") {
				//hide coloumn - Option
				this.getView().byId("columnOpcaoHealth").setVisible(false);
				// this.getView().byId("ipHealthInsurance").setValue("Exclusão");
				this.getView().byId("ipHealthInsurance").setEditable(false);

			} else {
				this.getView().byId("columnOpcaoOdonto").setVisible(false);
				this.getView().byId("ipDentalInsurance").setEditable(false);
			}
			var oModelDependents = this.getView().byId(table).getModel();
			oModelDependents.refresh();

		},

		fHideOption: function () {
			this.getView().byId("columnOpcaoOdonto").setVisible(false);
		},

		//	--------------------------------------------
		//	fCheckChange
		//	--------------------------------------------		
		fCheckChange: function (model) {

			var oModel = this.getView().getModel("ET_PLANS_ORIG");
			var oModelDependents = this.getView().byId(model).getModel().getData();

			for (var i = 0; i < oModelDependents.length; i++) {

				for (var z = 0; z < oModel.length; z++) {

					if (oModelDependents[i].SUBTY === oModel[z].SUBTY && oModelDependents[i].OBJPS === oModel[z].OBJPS) {

						// encontrou o dependente

						if (model === "tOdonto") {

							if (oModelDependents[i].ACTIVE_BRDE === oModel[z].ACTIVE_BRDE) {
								oModelDependents[i].ACTIO_BRDE = "";
							} else {
								if (oModelDependents[i].ACTIVE_BRDE) {
									oModelDependents[i].ACTIO_BRDE = "INS";
									this.attachmentRequiredDental = true;
								} else {
									oModelDependents[i].ACTIO_BRDE = "DEL";
								}
							}
						} else {

							if (oModelDependents[i].ACTIVE_BRHE === oModel[z].ACTIVE_BRHE) {
								oModelDependents[i].ACTIO_BRHE = "";
							} else {
								if (oModelDependents[i].ACTIVE_BRHE) {
									oModelDependents[i].ACTIO_BRHE = "INS";
								} else {
									oModelDependents[i].ACTIO_BRHE = "DEL";
									// this.attachmentRequiredHealth = true;
								}
							}

						}

					}

				}

			}
		},
		fGetUrlPlan: function (imPernr, imRequisitionId, imLoggedIn, plan) {
			var urlParam;

			urlParam = this.fFillURLParam("IM_PERNR", imPernr);
			urlParam = this.fFillURLParam("IM_REQUISITION_ID", imRequisitionId, urlParam);
			urlParam = this.fFillURLParam("IM_TYPE", plan, urlParam);
			urlParam = this.fFillURLParam("IM_LOGGED_IN", imLoggedIn, urlParam, true);

			return urlParam;
		},
		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var urlParam = this.fGetUrlPlan(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, 128);

			//novo
			function fSuccess(oEvent) {
				var results = oEvent.results[0];
				var requisitionId;
				var isApprover = results.EX_IS_APPROVER;

				if (oEvent.results[0].PLANS_HOLDER.results.length > 0) {
					requisitionId = oEvent.results[0].PLANS_HOLDER.results[0].REQUISITION_ID;

					//Isolates the model
					var oModel = new sap.ui.model.json.JSONModel(oEvent.results[0].PLANS_HOLDER);
					var oResults = JSON.parse(JSON.stringify(oModel.oData.results));
					that.getView().setModel(oResults, "ET_PLANS_ORIG");
					that.getView().setModel(oResults, "ET_PLANS_ELEK");

					//Sets the models to View
					that.fSetsModels(oEvent, that, isApprover);
					that.fSetModelElektro(oEvent, that, isApprover);
				}

				that.getView().byId("taJust").setValue(results.OBSERVATION);
				if (results.OBSERVATION_SSG !== null && results.OBSERVATION_SSG !== "" && results.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(results.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}

				// se tem id verificar os anexos
				if (requisitionId !== "00000000") {

					var filters = [];

					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, requisitionId)];

					var oModelAnexo = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
					that.getView().setModel(oModelAnexo, "anexo");

					// Update list binding
					// that.getView().byId("upldAttachments").getBinding("items").filter(filters);
				}

				if ((requisitionId !== null || requisitionId !== "" || requisitionId !== undefined) && requisitionId !== "00000000") {
					if (results.EX_MESSAGE.TYPE === "W" && results.IM_ACTION !== "A") {
						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.results[0].EX_MESSAGE.MESSAGE);
						}
					}
				} else {
					// var oLogModel = that.getView().getModel("ET_LOG_DEP");
					// if (oLogModel !== undefined) {
					// 	oLogModel.destroy();
					// 	that.obligatoryChanged = false;
					// }
				}

				that.fSearchHelps();
				that.fSetGlobalInformation(oEvent, that, requisitionId, true);
				that.fSetViewData(that);
				that.fSearchHelpHealthPlan();
				that.fSearchHelpOption();
				that.fVerifyAction();
				that.fGetLog();

				oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
				if (oGlobalData.MSG === "998") {
					that.fHideOption();
				}

				if (isApprover === "X") {
					that.getView().byId("btnIncludeDentalInsurance").setVisible(false);
					that.getView().byId("btnExcludeDentalInsurance").setVisible(false);
					// that.getView().byId("btnIncludeHealthInsurance").setVisible(false);
					// that.getView().byId("btnCancelHealthInsurance").setVisible(false);
					that.fHideOption();

				}

				if (that.getView().byId("btnIncludeDentalInsurance").getVisible() === true) {
					that.getView().byId("ipDentalInsurance").setEditable(false);
				}

				if (requisitionId !== "00000000") {
					that.getAttachment(requisitionId, "BPS");
				}
				if (that.getView().getModel("ET_HEADER").getData().BUKRS != "NEO") {
					that.getView().byId("formListOdonto").setVisible(true);
					that.getView().byId("formDentalInsurance").setVisible(false);
					that.getView().byId("tOdonto").setVisible(false);
				}

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

			// oModel.read("ET_PLANS" + urlParam, null, null, false, fSuccess, fError);

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oGlobalData.IM_PERNR);
			// urlParam = this.fFillURLParamFilter("TYPE", "O");
			urlParam = this.fFillURLParamFilter("IM_REQUISITION_ID", oGlobalData.IM_REQ_URL, urlParam);
			urlParam = this.fFillURLParamFilter("IM_LOGGED_IN", oGlobalData.IM_LOGGED_IN, urlParam);
			urlParam = this.fFillURLParamFilter("IM_TYPE", "128", urlParam);
			urlParam = urlParam + "&$expand=PLANS_HOLDER";
			oModel.read("ET_PLANS", null, urlParam, false, fSuccess, fError);

		},

		//	--------------------------------------------
		//	fSetsModels
		//	--------------------------------------------
		fSetsModels: function (oEvent, that, isApprover) {

			var oModel = new sap.ui.model.json.JSONModel(oEvent.results[0].PLANS_HOLDER);
			var oResults = JSON.parse(JSON.stringify(oModel.oData.results));
			var oModelHolder = new sap.ui.model.json.JSONModel([]);
			var oModelDependents = new sap.ui.model.json.JSONModel([]);
			var oTableOdonto = that.getView().byId("tOdonto");
			var oModelPlans = new sap.ui.model.json.JSONModel([]);
			// var oTableHealth = that.getView().byId("tHealth");

			//ET_HOLDER Model
			for (var i = 0; i < oResults.length; i++) {

				//HOLDER
				if (oResults[i].SUBTY === "" && oResults[i].OBJPS === "") {
					oModelHolder = oResults[i];
					if (oResults[i].BRDE != "") {
						oModelPlans.getData().push(oResults[i]);
					}
				}
				//Dependents
				else {
					oModelDependents.getData().push(oResults[i]);
				}
			}
			debugger;
			that.getView().setModel(oModelHolder, "ET_HOLDER");
			that.getView().setModel(oModelPlans, "ET_PLAN_MASTER");
			that.getView().setModel(oModelDependents, "ET_DEPENDENTS");

			// Caso o titular não tenha plano não exibir a tabela
			if (oModelHolder.ACTIVE_BRDE || oModelHolder.ACTIO_BRDE == "INS") {
				//TABLE MODEL - Odonto
				oTableOdonto.setModel(oModelDependents);
				oTableOdonto.bindRows("/");
				oTableOdonto.setVisibleRowCount(oModelDependents.getData().length);
				oTableOdonto.setVisible(true);
			}

			// Caso não tenha dependentes elegíveis
			if (oModelDependents.getData().length === 0) {
				oTableOdonto.setVisible(false);
				// oTableHealth.setVisible(false);
			}

			if (oModelHolder.ACTIO_BRDE === "DEL") {
				that.fRemoveDependents("tOdonto");
			}
			that.getView().byId("tPlan").setVisibleRowCount(oModelPlans.getData().length);

		},

		//--------------------------------------------
		//	fHelpRequest
		//--------------------------------------------		
		fHelpRequest: function (key, descriptionKey, cols, modelName, that, title, screenKeyField, screenTextField, onlyDesc, onlyKey) {
			var oScreenKeyField = that.getView().byId(screenKeyField);
			var oScreenTextField = that.getView().byId(screenTextField);
			var aData = that.getView().getModel("ET_PLANS").getData();

			that._oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				supportRanges: false,
				supportRangesOnly: false,
				supportMultiselect: false,
				key: key,
				descriptionKey: descriptionKey,

				ok: function (oEvent) {
					var aTokens = oEvent.getParameter("tokens");

					//Set values into others corresponding fiels in screen
					if (onlyDesc === false) {
						oScreenKeyField.setValue(aTokens[0].getProperty("key"));
						oScreenTextField.setText(aTokens[0].getProperty("text"));
					} else {
						if (onlyKey === true) {
							oScreenKeyField.setValue(aTokens[0].getProperty("key"));
						} else {
							//Removes the key from the description text
							var selectedKey = "(" + aTokens[0].getProperty("key") + ")";
							var selectedDes = aTokens[0].getProperty("text").replace(selectedKey, "");

							oScreenKeyField.setValue(selectedDes);
						}
					}

					aData.ACTIO_BRDE = "INS";
					aData.BPLAN_BRDE = aTokens[0].getProperty("key");
					aData.LTEXT_BRDE = selectedDes;

					that.fAccomodationFilter(that);

					that.getView().byId("btnSanity").setVisible(false);
					that.getView().byId("btnAccept").setEnabled(true);
					// that.getView().byId("slHealthInsuranceAccommodation").setEnabled(true);
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
			var oValue = [];

			for (var i = 0; i < oModel.length; i++) {
				oValue[i] = {};
				oValue[i].BPLAN = oModel[i].BPLAN;
				oValue[i].LTEXT = oModel[i].LTEXT;
			}

			var oPlansModel = new sap.ui.model.json.JSONModel(oValue);

			oTable.setModel(oPlansModel);
			oTable.bindRows("/");

			//Set title and open dialog
			that._oValueHelpDialog.setTitle(title);
			this._oValueHelpDialog.open();
		},

		//	--------------------------------------------
		//	fValidInputFields
		//	--------------------------------------------		
		fValidInputFields: function () {

			if (this.getView().byId("ipDentalInsurance").getValue() !== "") {

				var ipDentalInsurance = (this.getView().byId("ipDentalInsurance").getSelectedKey() !== "");

			}

			//if (this.getView().byId("ipHealthInsurance").getValue() === "Exclusão") {
			if (this.getView().byId("ipDentalInsurance").getEnabled() === false) {
				return false;
			}

			// if (ipHealthInsurance === false && ipDentalInsurance === false)
			if (ipDentalInsurance === false) {
				return true;
			} else {
				return false;
			}

		},

		//--------------------------------------------
		//	fSetViewData
		//--------------------------------------------			
		fSetViewData: function (that) {
			// var oModel = that.getView().getModel("ET_PLANS");
			var oModel = that.getView().getModel("ET_HOLDER");
			// var oModelData = oModel.getData();
			if (oModel != undefined) {
				that.addHighlightStyle();

				that.fDental(oModel, that);
			}
			// that.fHealth(oModel, that);
		},

		//--------------------------------------------
		//	fDental
		//--------------------------------------------			
		fDental: function (aData, that) {
			var oView = that.getView();

			switch (aData.ACTIO_BRDE) {
			case "DEL":
				// oView.byId("ipDentalInsurance").setValue("");
				// oView.byId("btnIncludeDentalInsurance").setVisible(true);
				oView.byId("btnIncludeDentalInsurance").setEnabled(true);
				oView.byId("btnExcludeDentalInsurance").setVisible(false);
				that.fSetFieldCssStyle("lblDentalInsurance", "highlight");
				that.fSetFieldCssStyle("lblHealthInsuranceAccommodation", "highlight");
				this.obligatoryChanged = true;
				break;

			case "INS":
				oView.byId("btnExcludeDentalInsurance").setVisible(true);
				oView.byId("btnExcludeDentalInsurance").setEnabled(true);
				oView.byId("btnIncludeDentalInsurance").setVisible(false);
				oView.byId("ipDentalInsurance").setValue(aData.LTEXT_BRDE);
				that.fSetFieldCssStyle("lblDentalInsurance", "highlight");
				that.fSetFieldCssStyle("lblHealthInsuranceAccommodation", "highlight");
				this.obligatoryChanged = true;
				break;
			default:
				// oView.byId("linkExcludeHealthInsurance").setVisible(false);
				that.fSetFieldCssStyle("lblDentalInsurance", "default");
				that.fSetFieldCssStyle("lblHealthInsuranceAccommodation", "default");

				if (aData.BPLAN_BRDE !== "") {
					oView.byId("ipDentalInsurance").setValue(aData.LTEXT_BRDE);
					// oView.byId("ipHealthInsurance").setEnabled(false);

					if (aData.BOPTI_BRHE !== "") {
						oView.byId("slHealthInsuranceAccommodation").setSelectedKey(aData.BOPTI_BRHE);
						oView.byId("slHealthInsuranceAccommodation").setEnabled(true);
					}

					if (aData.ACTIVE_BRDE === "" || (aData.ACTIVE_BRDE === "X" && aData.BPLAN_BRDE === "BRNO")) {
						oView.byId("btnIncludeDentalInsurance").setVisible(true);
						oView.byId("btnExcludeDentalInsurance").setVisible(false);
					} else {
						oView.byId("btnIncludeDentalInsurance").setVisible(false);
						oView.byId("btnExcludeDentalInsurance").setVisible(true);
					}

				} else {
					oView.byId("btnExcludeDentalInsurance").setVisible(false);

					if (aData.ACTIVE_BRDE === "") {
						oView.byId("btnIncludeDentalInsurance").setVisible(true);
					} else {

						oView.byId("btnIncludeDentalInsurance").setVisible(true);

						//It's going to be enabled if the user click on Insert
						oView.byId("ipDentalInsurance").setEnabled(false);
						oView.byId("slHealthInsuranceAccommodation").setEnabled(false);
					}
				}
			}
		},

		//--------------------------------------------
		//	fAccomodationFilter
		//--------------------------------------------			
		fAccomodationFilter: function (that) {
			// var aData = that.getView().getModel("ET_PLANS").getData();
			var aData = that.getView().getModel("ET_HOLDER");
			var aAccomodationValues = that.getView().getModel("ET_SH_PLANS");

			// that.getView().byId("slHealthInsuranceAccommodation").setEnabled(true);

			if (aData.BPLAN_BRDE !== "" && aData.BPLAN_BRDE !== undefined && aData.BPLAN_BRDE !== null && aData.ACTIO_BRDE !== "DEL") {
				if (aAccomodationValues !== undefined) {
					for (var i = 0; i < aAccomodationValues.length; i++) {

						if (aAccomodationValues[i].BPLAN === aData.BPLAN_BRDE) {
							var oAccomodation = new sap.ui.model.json.JSONModel(aAccomodationValues[i].PLANS.results);
							that.getView().setModel(oAccomodation, "ET_SH_ACCOMMODATION");
							break;
						}
					}
				}
			}

			if (aData.BOPTI_BRHE !== "" && aData.BOPTI_BRHE !== undefined && oAccomodation !== undefined) {
				// that.getView().byId("slHealthInsuranceAccommodation").setSelectedKey(aData.BOPTI_BRHE);
				// that.getView().byId("slHealthInsuranceAccommodation").setEnabled(false);
			}
		},

		//--------------------------------------------
		//	fUnableFields
		//--------------------------------------------	
		fUnableFields: function () {
			var oView = this.getView();
			oView.byId("UploadCollection").setUploadButtonInvisible(true);

			oView.byId("btnSanity").setEnabled(false);
			oView.byId("btnSave").setEnabled(false);
			oView.byId("btnAccept").setEnabled(false);
			oView.byId("btnCancel").setEnabled(false);

			oView.byId("btnIncludeDentalInsurance").setVisible(false);
			oView.byId("btnExcludeDentalInsurance").setVisible(false);

			oView.byId("slHealthInsuranceAccommodation").setEnabled(false);
			oView.byId("ipDentalInsurance").setEnabled(false);

			oView.byId("taJust").setEnabled(false);
			oView.byId("btnAdd").setVisible(false);
			oView.byId("btnModify").setVisible(false);
			oView.byId("btnRemove").setVisible(false);

			this.fHideOption();

		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oData = this.getView().getModel("ET_HEADER").getData();
			var that = this;

			function fSuccess(oEvent) {
				that.getView().setModel(oEvent.results, "ET_SH_PLANS");
			}

			function fError() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR);
			urlParam = urlParam + "&$expand=PLANS";

			oModel.read("ET_SH_PLANS", null, urlParam, false, fSuccess, fError);
		},

		fSearchHelpHealthPlan: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oData = this.getView().getModel("ET_HEADER").getData();
			var aData = this.getView().getModel("ET_HOLDER");
			var that = this;

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				var jsonModel = new sap.ui.model.json.JSONModel([]);
				for (var i = 0; i < oEvent.results.length; i++) {
					jsonModel.getData().push({
						IM_PERNR: oValue.oData[i].IM_PERNR,
						BPLAN: oValue.oData[i].BPLAN,
						LTEXT: oValue.oData[i].LTEXT,
						TYPE: oValue.oData[i].TYPE,
						PLTYP: oValue.oData[i].PLTYP
					});
				}

				that.getView().setModel(jsonModel, "ET_SH_TYPE_PLANS");
				if(aData != undefined) {
					that.byId("ipDentalInsurance").setSelectedKey(aData.BPLAN_BRDE);
				}
			}

			function fError() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR);
			urlParam = this.fFillURLParamFilter("TYPE", "", urlParam);
			// urlParam = urlParam + "&$expand=PLANS";

			oModel.read("E_SH_HEALTH_PLAN", null, urlParam, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	onIncludeDentalInsurance
		//	--------------------------------------------		
		onIncludeDentalInsurance: function () {
			var oCurrentData = this.getView().getModel("ET_HOLDER");
			var oHealthData = this.getView().getModel("ET_SH_TYPE_PLANS").aBindings;
			debugger;
			oCurrentData.ACTIO_BRDE = "INS";
			oCurrentData.LTEXT_BRDE = oHealthData[0].LTEXT;
			oCurrentData.BPLAN_BRDE = oHealthData[0].BPLAN;

			this.getView().byId("ipDentalInsurance").setValue(oHealthData[0].LTEXT);
			this.getView().byId("ipDentalInsurance").setEditable(true);
			this.getView().byId("ipDentalInsurance").setEnabled(true);
			this.getView().byId("slHealthInsuranceAccommodation").setEnabled(true);
			this.getView().byId("btnIncludeDentalInsurance").setVisible(false);
			this.getView().byId("btnExcludeDentalInsurance").setVisible(true);
			this.getView().byId("btnExcludeDentalInsurance").setEnabled(true);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
			this.getView().byId("btnSanity").setVisible(false);

			this.fAccomodationFilter(this);
			this.attachmentRequiredHealth = true;

			// caso tenha dependentes
			var oDependents = this.getView().getModel("ET_DEPENDENTS");
			if (oDependents.getData().length) {

				var oTableOdonto = this.getView().byId("tOdonto");
				oTableOdonto.setModel(oDependents);
				oTableOdonto.bindRows("/");
				oTableOdonto.setVisibleRowCount(oDependents.getData().length);
				oTableOdonto.setVisible(true);

				MessageBox.warning(
					"Caso também deseja incluir dependentes, favor alterar o campo 'opção' para 'Sim' em cada um dos dependentes. \n \n Deverei cumprir todas as regras de carência determinadas pela operadora, a não ser no caso de inclusão dentro do período dos 30 primeiros dias a contar da data de admissão."
				);
				this.attachmentRequiredIncludeDep = true;

				for (var i = 0; i < oDependents.getData().length; i++) {

					this.getView().byId("__xmlview3--selDE-col2-row" + i).setEnabled(true);

				}

			}

		},

		//	--------------------------------------------
		//	fMessageExcludeDentalInsurance
		//	--------------------------------------------		
		fMessageExcludeDentalInsurance: function () {
			var message;

			message =
				"Lembramos que no caso de exclusão do plano odontológico antes do prazo previsto acarretará em multa, conforme contratado estipulado pelo seu plano: \n\n";
			message = message +
				"INPAO: Em caso de desistência antes do prazo, será devido a cobrança do pagamento de multa equivalente ao valor de 6 mensalidades. \n\n";
			message = message +
				"UNIODONTO: Em caso de desistência antes do prazo, será devido a cobrança do pagamento de multa equivalente a 50% das mensalidades restantes. \n\n";
			message = message +
				"MetLife: Em caso de desistência antes do prazo, será devido a cobrança do pagamento de multa equivalente ao valor de 6 mensalidades”. ";

			MessageBox.warning(message);
		},

		//	--------------------------------------------
		//	fMessageIncludeDentalInsurance
		//	--------------------------------------------
		fMessageIncludeDentalInsurance: function () {

			MessageBox.warning("Necessário anexar formulário de inclusão no plano odontológico");

		},
		onCancelDentalInsurance: function () {

			var that = this;

			MessageBox.confirm(
				"Confirma exclusão do plano odontológico ?", {
					title: "Exclusão",
					initialFocus: sap.m.MessageBox.Action.CANCEL,
					onClose: function (sButton) {
						if (sButton === MessageBox.Action.OK) {
							that.onExcludeDentalInsurance();
							return true;
						}
					}
				});

		},
		//	--------------------------------------------
		//	onExcludeDentalInsurance
		//	--------------------------------------------		
		onExcludeDentalInsurance: function () {
			var oCurrentData = this.getView().getModel("ET_HOLDER");
			var oOrigData = this.getView().getModel("ET_PLANS_ORIG");

			if (oOrigData.BPLAN_BRDE !== "" && oOrigData.BOPTI_BRDE !== "") {
				oCurrentData.ACTIO_BRDE = "DEL";
				this.attachmentRequiredHealth = true;

				var message = "Estou ciente que: \n\n";
				message = message +
					"Poderei solicitar o retorno ao plano, porém, deverei cumprir todas as regras de carência determinadas pela operadora \n\n";
				message = message +
					"O descarte de minhas carteirinhas deverá ocorrer junto ao RH Local. \n\n";
				message = message +
					"Para realizar a exclusão do seu plano de saúde, anexe o comprovante do cadastro do outro plano assim como o Termo de exclusão. ";

				MessageBox.warning(message);

				// MessageBox.warning(
				// 	"Para realizar a exclusão do seu plano de saúde, anexe o comprovante do cadastro do outro plano assim como o Termo de exclusão");

				// this.getView().byId("linkExcludeHealthInsurance").setVisible(true);

				this.fRemoveDependents("tOdonto");

			} else {
				oCurrentData.ACTIO_BRDE = "";
				oCurrentData.BPLAN_BRDE = oOrigData.BPLAN_BRDE;
				oCurrentData.BOPTI_BRDE = oOrigData.BOPTI_BRDE;
				oCurrentData.LTEXT_BRDE = oOrigData.LTEXT_BRDE;

				// this.getView().byId("linkExcludeHealthInsurance").setVisible(false);
				this.getView().byId("btnIncludeDentalInsurance").setVisible(true);
				this.attachmentRequiredHealth = false;
			}

			//Clear Fields
			this.getView().byId("slHealthInsuranceAccommodation").setEnabled(false);
			this.getView().byId("ipDentalInsurance").setEnabled(false);
			this.getView().byId("btnExcludeDentalInsurance").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
			this.getView().byId("btnSanity").setVisible(false);

			//Clear the Accomodation Model, so the field gets empty
			var oAccomodationModel = new sap.ui.model.json.JSONModel();
			this.getView().setModel(oAccomodationModel, "ET_SH_ACCOMMODATION");
			// var that = this;

			// MessageBox.confirm(
			// 	"Confirma exclusão do plano odontológico ?", {
			// 		title: "Exclusão",
			// 		initialFocus: sap.m.MessageBox.Action.CANCEL,
			// 		onClose: function (sButton) {
			// 			if (sButton === MessageBox.Action.OK) {
			// 				that.fExcludeDentalInsurance();
			// 				return true;
			// 			}
			// 		}
			// 	});

		},
		//	--------------------------------------------
		//	fExcludeDentalInsurance
		//	--------------------------------------------		
		fExcludeDentalInsurance: function () {
			var oCurrentData = this.getView().getModel("ET_HOLDER");

			this.getView().byId("ipDentalInsurance").setValue("");

			if (oCurrentData.BPLAN_BRDE.trim() !== "") {
				oCurrentData.ACTIO_BRDE = "DEL";
				this.fMessageExcludeDentalInsurance();
				this.attachmentRequiredDental = false;
			} else {
				oCurrentData.ACTIO_BRDE = "";
				this.attachmentRequiredDental = false;
			}

			this.getView().byId("btnExcludeDentalInsurance").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
			this.getView().byId("btnSanity").setVisible(false);
			this.fRemoveDependents("tOdonto");

		},

		onBeforeUpload: function (oEvent) {

			var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
			var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
			var filename = oEvent.getParameter("fileName");
			var caracteristica = "DOCUMENTOODONTO";

			// FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
			var dados = filename + ";BPS;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;

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
				this.getAttachment(req, "BPS");
			}
		},

		// --------------------------------------------
		// fCreateRequisition
		// -------------------------------------------- 
		fCreateRequisition: function (that, action, req, newDt) {
			var oCreate = {};
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var observation;

			if (oGlobalData.IM_LOGGED_IN == 5) {
				observation = that.getView().byId("taJustSSG").getValue();
			} else {
				observation = that.getView().byId("taJust").getValue();
			}

			oCreate = {
				"IM_ACTION": action,
				"IM_LOGGED_IN": oGlobalData.IM_LOGGED_IN,
				"IM_PERNR": oGlobalData.IM_PERNR,
				"IM_REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
				"OBSERVATION": observation,
				"IM_TYPE": "128"
			};

			if (that.getView().getModel("ET_HEADER").getData().BUKRS != "NEO") {
				that.fFillCreateDentalDataElek(oCreate, that, req, newDt);
			} else {
				that.fFillCreateHealthData(oCreate, that, req, newDt);
			}

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				that.obligatoryChanged = false;

				switch (action) {
				case "A":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
					that.fUnableApprovalButtons(that);
					that.fUnableAllButtons(that);

					// *** ANEXO ***
					break;

				case "D":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " reprovada!");
					that.fUnableApprovalButtons(that);

					// *** ANEXO ***
					break;

				case "S":
					that.fSucessMessageFromSendAction(oEvent);

					that.fHideOption();

					// *** ANEXO ***
					that.saveAttachment();
					break;

				case "C":
					MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

					that.fGetBlock();

					break;

				case "X":
					MessageBox.success("Dados confirmados com sucesso! Obrigado por validar suas informações para o eSocial");
					that.getView().byId("btnSanity").setVisible(false);
					oGlobalData.IM_REQUISITION_ID = "00000000";
					break;

				case "R":
					MessageBox.success(
						"Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
					);

					that.fSetGlobalInformation(oEvent, that, undefined, true);

					// *** ANEXO ***
					break;

				}

				// that.fSetViewData(that);
				that.fVerifyAction(false, action);
			}

			//ERRO
			function fError(oEvent) {
				oGlobalData.IM_REQUISITION_ID = that.fGetRequisitionId(oEvent);

				if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
					var message = $(oEvent.response.body).find('message').first().text();

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
			oModel.create("ET_PLANS", oCreate, null, fSuccess, fError);

		},

		// --------------------------------------------
		// fFillCreateHealthData
		// --------------------------------------------		
		fFillCreateHealthData: function (oCreate, that, req, newDt) {
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var oHolder = that.getView().getModel("ET_HOLDER");
			var oDependents = that.getView().getModel("ET_DEPENDENTS").getData();
			var PLANS_HOLDER = new sap.ui.model.json.JSONModel([]);

			if (oHolder.ACTIO_BRDE === "DEL") {
				oHolder.BPLAN_BRDE = "BRNO";
			} else {
				oHolder.BPLAN_BRDE = oHolder.BPLAN_BRDE;
			}

			if (oHolder.ACTIO_BRDE === "INS") {
				oHolder.BOPTI_BRHE = that.getView().byId("slHealthInsuranceAccommodation").getSelectedKey();
			}

			if (oHolder.ACTIO_BRDE == "") {
				oHolder.ACTIO_BRDE = "MOD";
			}

			if (newDt === "" || newDt === undefined) {
				newDt = null;
			}

			if (oHolder.ACTIVE_BRDE == "" || oHolder.ACTIVE_BRDE == undefined) {
				oHolder.ACTIVE_BRDE = "X";
			}

			// titular
			PLANS_HOLDER.getData().push(({
				"REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
				"SUBTY": oHolder.SUBTY,
				"OBJPS": oHolder.OBJPS,
				"BRDE": oHolder.BRDE, //,
				"LTEXT_BRDE": that.getView().byId("ipDentalInsurance").getSelectedText(),
				"BPLAN_BRDE": that.getView().byId("ipDentalInsurance").getSelectedKey(),
				"ACTIVE_BRDE": oHolder.ACTIVE_BRDE,
				"ACTIO_BRDE": oHolder.ACTIO_BRDE,
				"LTEXT_BRHE": "",
				"BPLAN_BRHE": "",
				"BOPTI_BRHE": that.getView().byId("slHealthInsuranceAccommodation").getSelectedKey(),
				"ACTIVE_BRHE": "",
				"ACTIO_BRHE": "",
				"FCNAM": null,
				"TYPE_SAVE": req,
				"SSG_DATE": newDt

			}));

			// dependentes
			for (var i = 0; i < oDependents.length; i++) {

				PLANS_HOLDER.getData().push(({
					"REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
					"SUBTY": oDependents[i].SUBTY,
					"OBJPS": oDependents[i].OBJPS,
					"BRDE": oDependents[i].BRDE,
					"LTEXT_BRDE": oDependents[i].LTEXT_BRDE,
					"BPLAN_BRDE": oDependents[i].BPLAN_BRDE,
					"ACTIVE_BRDE": oDependents[i].ACTIVE_BRDE,
					"ACTIO_BRDE": oDependents[i].ACTIO_BRDE,
					"LTEXT_BRHE": "",
					"BPLAN_BRHE": "",
					"BOPTI_BRHE": oDependents[i].BOPTI_BRHE,
					"ACTIVE_BRHE": "",
					"ACTIO_BRHE": "",
					"FCNAM": oDependents[i].FCNAM

				}));

			}

			oCreate.PLANS_HOLDER = PLANS_HOLDER.getData();
		},

		// --------------------------------------------
		// fActions
		// -------------------------------------------- 		
		fActions: function (that, actionText, action, req, newDt) {
			var question;

			switch (action) {
			case "A": //Approve
				question = "Confirmar aprovação?";
				break;

			case "D": //Decline
				question = "Confirmar reprovação?";
				break;

			case "C": //Cancel
				question = "Confirmar cancelamento?";
				break;

			default:
				question = "Confirmar " + actionText + "?";
			}

			MessageBox.confirm(question, {
				title: actionText,
				initialFocus: sap.m.MessageBox.Action.CANCEL,
				onClose: function (sButton) {
					if (sButton === MessageBox.Action.OK) {
						that.fCreateRequisition(that, action, req, newDt);
						return true;
					}
				}
			});
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {
			var attachment = this.validAttachment();
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");
			var oModelHolder = that.getView().getModel("ET_HOLDER");
			var oDependents = this.getView().getModel("ET_DEPENDENTS");

			var bCheckDependent = false;

			if (attachment == false) {
				return;
			}

			if (this.attachmentRequiredIncludeDep === true) {
				for (var i = 0; i < oDependents.oData.length; i++) {
					if (oDependents.oData[i].ACTIO_BRDE === "INS") {
						bCheckDependent = true;
					}
				}
			}

			if (this.fValidInputFields() === true) {
				this.handleErrorMessageBoxPress();
			} else if (attachment === false && ((this.attachmentRequiredDental === true) || this.obligatoryChanged ===
					true)) {
				this.handleErrorMessageAttachment();
			} else {
				MessageBox.confirm(
					message, {
						title: "Termo de responsabilidade",
						initialFocus: sap.m.MessageBox.Action.CANCEL,
						onClose: function (sButton) {
							if (sButton === MessageBox.Action.OK) {
								that.fActions(that, "envio", "S");
							}
						}
					});
			}

			// }

		},

		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function () {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Cancelamento", "C");
			}
		},

		// --------------------------------------------
		// onSanitation
		// --------------------------------------------  
		onSanitation: function () {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			MessageBox.confirm(
				message, {
					title: "Termo de responsabilidade",
					initialFocus: sap.m.MessageBox.Action.CANCEL,
					onClose: function (sButton) {
						if (sButton === MessageBox.Action.OK) {
							that.fActions(that, "saneamento", "X");
						}
					}
				});
		},

		// // --------------------------------------------
		// // onApprove
		// // -------------------------------------------- 		

		onApprove: function () {
			this.fActions(this, "Aprovação", "A");
		},

		// --------------------------------------------
		// onSave
		// --------------------------------------------  
		onSave: function () {
			this.fActions(this, "gravação", "R");
		},

		// --------------------------------------------
		// onReject
		// --------------------------------------------  
		onReject: function () {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Rejeição", "D");
			}
		},
		changeDentalInsurance: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oData = this.getView().getModel("ET_HEADER").getData();
			var aData = this.getView().getModel("ET_HOLDER");
			var that = this;

			function fSuccessOpt(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				var jsonModelOpt = new sap.ui.model.json.JSONModel([]);

				for (var i = 0; i < oEvent.results.length; i++) {
					jsonModelOpt.getData().push({
						IM_PERNR: oValue.oData[i].IM_PERNR,
						BPLAN: oValue.oData[i].BPLAN,
						BOPTI: oValue.oData[i].BOPTI,
						LTEXT: oValue.oData[i].LTEXT,
					});
				}
				that.getView().setModel(jsonModelOpt, "ET_SH_ACCOMMODATION");
				that.byId("slHealthInsuranceAccommodation").setSelectedKey(aData.BOPTI_BRBE)
			}

			function fErrorOpt() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}

			var localBplan = this.byId("ipDentalInsurance").getSelectedKey();
			var urlParam = this.fFillURLParamFilter("IM_BPLAN", localBplan);
			urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR, urlParam);

			oModel.read("ET_SH_ACCOMMODATION", null, urlParam, false, fSuccessOpt, fErrorOpt);
		},

		fSearchHelpOption: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oData = this.getView().getModel("ET_HEADER").getData();
			var aData = this.getView().getModel("ET_HOLDER");
			var that = this;

			function fSuccessOpt(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				var jsonModelOpt = new sap.ui.model.json.JSONModel([]);

				for (var i = 0; i < oEvent.results.length; i++) {
					jsonModelOpt.getData().push({
						IM_PERNR: oValue.oData[i].IM_PERNR,
						BPLAN: oValue.oData[i].BPLAN,
						BOPTI: oValue.oData[i].BOPTI,
						LTEXT: oValue.oData[i].LTEXT,
					});
				}

				that.getView().setModel(jsonModelOpt, "ET_SH_ACCOMMODATION");
				
				if(aData != undefined){
					that.byId("slHealthInsuranceAccommodation").setSelectedKey(aData.BOPTI_BRHE);
				}

			}

			function fErrorOpt() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}
			
			if(aData != undefined){
				var urlParam = this.fFillURLParamFilter("IM_BPLAN", aData.BPLAN_BRDE);
				urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR, urlParam);
			}else{
				urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR);
			}

			oModel.read("ET_SH_ACCOMMODATION", null, urlParam, false, fSuccessOpt, fErrorOpt);
		},

		// Elektro
		onAddPressed: function () {
			var oView = this.getView();
			var oModelDependents = oView.getModel("ET_DEP_MASTER");
			var oTableHealth = this.getView().byId("tOdonto");

			this.fEnableButtonsAction(true);
			oView.byId("ipDentalInsurance").setSelectedKey();
			oView.byId("slHealthInsuranceAccommodation").setSelectedKey();
			oView.byId("ipDentalInsurance").setEnabled(true);
			oView.byId("slHealthInsuranceAccommodation").setEnabled(true);
			oView.byId("formDentalInsurance").setVisible(true);
			oView.byId("tOdonto").setVisible(true);
			oView.byId("btnIncludeDentalInsurance").setVisible(false);
			oView.byId("btnExcludeDentalInsurance").setVisible(false);
			oView.byId("columnOpcaoOdonto").setVisible(true);
			oView.byId("ipDentalInsurance").setEditable(true);
			oView.byId("toolbarList").setVisible(false);

			this.getView().setModel(oModelDependents, "ET_DEPENDENTS");
			oTableHealth.setModel(oModelDependents);
			oTableHealth.bindRows("/");
			oTableHealth.setVisibleRowCount(oModelDependents.getData().length);
			oTableHealth.setVisible(true);
			this.fSearchHelpHealthPlanElek();
			this.statusMod = "INS";
			this.fEnableButtonDep(true);
		},
		onModPressed: function () {
			var that = this;
			var oView = this.getView();
			var index = oView.byId("tPlan").getSelectedIndex();
			var plans = oView.getModel("ET_PLAN_MASTER").getData();

			if (index < 0) {
				MessageBox.error("Selecione um plano para edição");
				return;
			}

			this.fEnableButtonsAction(true);
			oView.byId("ipDentalInsurance").setEnabled(true);
			oView.byId("slHealthInsuranceAccommodation").setEnabled(true);
			oView.byId("formDentalInsurance").setVisible(true);
			oView.byId("tOdonto").setVisible(true);
			oView.byId("btnIncludeDentalInsurance").setVisible(false);
			oView.byId("btnExcludeDentalInsurance").setVisible(false);
			oView.byId("columnOpcaoOdonto").setVisible(true);
			oView.byId("ipDentalInsurance").setEditable(true);
			oView.byId("toolbarList").setVisible(false);

			oView.setModel(plans[index], "ET_HOLDER");
			oView.byId("ipDentalInsurance").setSelectedKey(plans[index].BPLAN_BRDE);
			oView.byId("slHealthInsuranceAccommodation").setSelectedKey(plans[index].BOPTI_BRHE);

			this.fSearchHelpHealthPlanElekMod(plans[index].BRDE, plans[index].BPLAN_BRDE);
			this.fSearchHelpOption(that);
			this.fSetDepenElektro(plans[index]);
			this.statusMod = "MOD";
			this.fEnableButtonDep(true);
		},
		onRemPressed: function () {
			var that = this;
			var oView = this.getView();
			var index = oView.byId("tPlan").getSelectedIndex();
			var plans = oView.getModel("ET_PLAN_MASTER");
			var master = oView.getModel("ET_PLANS_ELEK");

			if (index < 0) {
				MessageBox.error("Selecione um plano para exclusão");
				return;
			}

			for (var i = 0; i < plans.getData().length; i++) {
				if (plans.getData()[i].BRDE == plans.getData()[index].BRDE) {
					plans.getData()[i].ACTIO_BRDE = "DEL";
				}
			}

			for (i = 0; i < master.length; i++) {
				if (master[i].BRDE == plans.getData()[index].BRDE) {
					master[i].ACTIO_BRDE = "DEL";
				}
			}

			oView.setModel(new sap.ui.model.json.JSONModel(plans.getData()), "ET_PLAN_MASTER");
			oView.setModel(master, "ET_PLANS_ELEK");
		},
		onVisPressed: function () {
			var that = this;
			var oView = this.getView();
			var index = oView.byId("tPlan").getSelectedIndex();
			var plans = oView.getModel("ET_PLAN_MASTER").getData();

			if (index < 0) {
				MessageBox.error("Selecione um plano para visualização");
				return;
			}

			oView.byId("columnOpcaoOdonto").setVisible(true);
			oView.byId("ipDentalInsurance").setEnabled(false);
			oView.byId("slHealthInsuranceAccommodation").setEnabled(false);
			oView.byId("btnIncludeDentalInsurance").setVisible(false);
			oView.byId("btnExcludeDentalInsurance").setVisible(false);
			oView.byId("formDentalInsurance").setVisible(true);
			oView.byId("tOdonto").setVisible(true);

			oView.setModel(plans[index], "ET_HOLDER");

			oView.byId("ipDentalInsurance").setSelectedKey(plans[index].BPLAN_BRDE);
			oView.byId("slHealthInsuranceAccommodation").setSelectedKey(plans[index].BOPTI_BRHE);

			this.fSearchHelpHealthPlan();
			this.fSearchHelpOption(that);
			this.fSetDepenElektro(plans[index]);
			this.fEnableButtonDep(false);

		},
		fEnableButtonDep: function (enable) {
			var oDependents = this.getView().getModel("ET_DEPENDENTS");
			for (var i = 0; i < oDependents.getData().length; i++) {
				this.getView().byId("__xmlview3--selDE-col2-row" + i).setEnabled(enable);
			}
		},
		fSetDepenElektro: function (plan) {
			var oModelDependents = new sap.ui.model.json.JSONModel([]);
			var oTableHealth = this.getView().byId("tOdonto");
			var oInitial = this.getView().getModel("ET_PLANS_ELEK");

			//ET_HOLDER Model
			for (var i = 0; i < oInitial.length; i++) {

				if (oInitial[i].BRDE != plan.BRDE) {
					continue;
				}

				//HOLDER
				if (oInitial[i].SUBTY === "" && oInitial[i].OBJPS === "") {}
				//Dependents
				else {
					oModelDependents.getData().push(oInitial[i]);
				}
			}

			this.getView().setModel(oModelDependents, "ET_DEPENDENTS");
			oTableHealth.setModel(oModelDependents);
			oTableHealth.bindRows("/");
			oTableHealth.setVisibleRowCount(oModelDependents.getData().length);
			oTableHealth.setVisible(true);
		},
		fSetModelElektro: function (oEvent, that, isApprover) {

			var oModel = new sap.ui.model.json.JSONModel(oEvent.results[0].PLANS_HOLDER);
			var oResults = JSON.parse(JSON.stringify(oModel.oData.results));
			var oModelDep = new sap.ui.model.json.JSONModel([]);
			var oTableHealth = that.getView().byId("tOdonto");
			var brde = oResults[0].BRDE;

			//ET_HOLDER Model
			for (var i = 0; i < oResults.length; i++) {

				//HOLDER
				if (oResults[i].SUBTY != "" && oResults[i].BRDE == brde) {
					oModelDep.getData().push(oResults[i]);
				}
			}

			that.getView().setModel(oModelDep, "ET_DEP_MASTER");

			//TABLE MODEL - Health
			oTableHealth.setModel(oModelDep);
			oTableHealth.bindRows("/");
			oTableHealth.setVisibleRowCount(oModelDep.getData().length);
			oTableHealth.setVisible(true);

		},
		fInsertItem: function () {
			var oView = this.getView();
			var plan = oView.getModel("ET_PLAN_MASTER");
			var tPlan = oView.byId("tPlan");
			var master = oView.getModel("ET_PLANS_ELEK");
			var depTable = oView.byId("tOdonto").getModel().getData();

			oView.byId("formDentalInsurance").setVisible(false);
			oView.byId("tOdonto").setVisible(false);

			var obj = {
				ACTIO_BRDE: this.statusMod,
				ACTIO_BRHE: "",
				ACTIVE_BRDE: "X",
				ACTIVE_BRHE: "",
				BOPTI_BRHE: oView.byId("slHealthInsuranceAccommodation").getSelectedKey(),
				BPLAN_BRDE: oView.byId("ipDentalInsurance").getSelectedKey(),
				BPLAN_BRHE: "",
				BRDE: oView.byId("ipDentalInsurance").getSelectedItem().getCustomData()[0].getValue(),
				FCNAM: "",
				LTEXT_BRDE: oView.byId("ipDentalInsurance").getSelectedItem().getText(),
				LTEXT_BRHE: "",
				OBJPS: "",
				REQUISITION_ID: "",
				SSG_DATE: null,
				SUBTY: "",
				TYPE_SAVE: ""
			};

			plan.getData().push(obj);
			tPlan.setVisibleRowCount(plan.getData().length);
			oView.setModel(new sap.ui.model.json.JSONModel(plan.getData()), "ET_PLAN_MASTER");
			master.push(obj);
			oView.byId("toolbarList").setVisible(true);

			for (var i = 0; i < depTable.length; i++) {

				if (depTable[i].ACTIVE_BRDE == "X") {
					depTable[i].ACTIO_BRDE = "INS";
				} else {
					depTable[i].ACTIO_BRDE = "";
				}

				depTable[i].BOPTI_BRHE = obj.BOPTI_BRHE;
				depTable[i].BPLAN_BRDE = obj.BPLAN_BRDE;
				depTable[i].BRDE = obj.BRDE;
				depTable[i].LTEXT_BRDE = obj.LTEXT_BRDE;
				master.push(depTable[i]);
			}

			oView.setModel(master, "ET_PLANS_ELEK");
			this.fEnableButtonsAction(false);
			this.statusMod = "";
		},
		fModifyItem: function () {
			var oView = this.getView();
			var plan = oView.getModel("ET_PLAN_MASTER");
			var tPlan = oView.byId("tPlan");
			var master = oView.getModel("ET_PLANS_ELEK");
			var changed = [];
			var depTable = oView.byId("tOdonto").getModel().getData();

			oView.byId("formDentalInsurance").setVisible(false);
			oView.byId("tOdonto").setVisible(false);

			var obj = {
				ACTIO_BRDE: this.statusMod,
				ACTIO_BRHE: "",
				ACTIVE_BRDE: "X",
				ACTIVE_BRHE: "",
				BOPTI_BRHE: oView.byId("slHealthInsuranceAccommodation").getSelectedKey(),
				BPLAN_BRDE: oView.byId("ipDentalInsurance").getSelectedKey(),
				BPLAN_BRHE: "",
				BRDE: oView.byId("ipDentalInsurance").getSelectedItem().getCustomData()[0].getValue(),
				FCNAM: "",
				LTEXT_BRDE: oView.byId("ipDentalInsurance").getSelectedItem().getText(),
				LTEXT_BRHE: "",
				OBJPS: "",
				REQUISITION_ID: "",
				SSG_DATE: null,
				SUBTY: "",
				TYPE_SAVE: ""
			};

			for (var i = 0; i < plan.getData().length; i++) {
				if (plan.getData()[i].BRDE == obj.BRDE && plan.getData()[i].OBJPS == "" && plan.getData()[i].SUBTY == "") {
					plan.getData()[i] = obj;
				}
			}

			oView.setModel(new sap.ui.model.json.JSONModel(plan.getData()), "ET_PLAN_MASTER");

			changed.push(obj);
			debugger;
			for (i = 0; i < depTable.length; i++) {

				if (depTable[i].ACTIVE_BRDE == "X") {
					depTable[i].ACTIO_BRDE = "INS";
				} else {
					depTable[i].ACTIO_BRDE = "";
				}

				depTable[i].BOPTI_BRHE = obj.BOPTI_BRHE;
				depTable[i].BPLAN_BRDE = obj.BPLAN_BRDE;
				depTable[i].BRDE = obj.BRDE;
				depTable[i].LTEXT_BRDE = obj.LTEXT_BRDE;
				changed.push(depTable[i]);
			}

			for (i = 0; i < changed.length; i++) {
				for (var j = 0; i < master.length; j++) {
					if (changed[i].BRDE == master[j].BRDE && changed[i].SUBTY == master[j].SUBTY && changed[i].OBJPS == master[j].OBJPS) {
						master[j].BOPTI_BRHE = changed[i].BOPTI_BRHE;
						master[j].BPLAN_BRDE = changed[i].BPLAN_BRDE;
						master[j].LTEXT_BRDE = changed[i].LTEXT_BRDE;
						master[j].ACTIO_BRDE = changed[i].ACTIO_BRDE;
						master[j].ACTIVE_BRDE = changed[i].ACTIVE_BRDE;
						break;
					}
				}
			}

			oView.setModel(master, "ET_PLANS_ELEK");
			this.fEnableButtonsAction(false);
			oView.byId("toolbarList").setVisible(true);
			this.statusMod = "";
		},
		onCancelItem: function () {
			var oView = this.getView();
			oView.byId("formDentalInsurance").setVisible(false);
			oView.byId("tOdonto").setVisible(false);

			this.fEnableButtonsAction(false);
			oView.byId("toolbarList").setVisible(true);
			this.statusMod = "";

			MessageBox.success("Ação Cancelada!");
		},
		onAcceptItem: function () {

			if (this.statusMod == "INS") {
				this.fInsertItem();
			} else if (this.statusMod == "MOD") {
				this.fModifyItem();
			}

		},
		fEnableButtonsAction: function (action) {
			var oView = this.getView();
			oView.byId("btnCancelItem").setVisible(action);
			oView.byId("btnAcceptItem").setVisible(action);
			oView.byId("btnAccept").setVisible(!action);
		},
		fSearchHelpHealthPlanElek: function () {
			var oView = this.getView();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oData = this.getView().getModel("ET_HEADER").getData();
			var aData = this.getView().getModel("ET_HOLDER");
			var that = this;
			var encontrou = false;

			var plans = oView.getModel("ET_PLAN_MASTER");

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				var jsonModel = new sap.ui.model.json.JSONModel([]);
				
				debugger;
				
				for (var i = 0; i < oEvent.results.length; i++) {
					if (plans.getData().length > 0) {
						for (var j = 0; j < plans.getData().length; j++) {
							if (plans.getData()[j].BRDE == oEvent.results[i].PLTYP) {
								encontrou = true;
							}
						}
					}

					if (encontrou == false) {
						jsonModel.getData().push({
							IM_PERNR: oValue.oData[i].IM_PERNR,
							BPLAN: oValue.oData[i].BPLAN,
							LTEXT: oValue.oData[i].LTEXT,
							TYPE: oValue.oData[i].TYPE,
							PLTYP: oValue.oData[i].PLTYP,
						});
					}
					encontrou = false;
				}

				that.getView().setModel(jsonModel, "ET_SH_TYPE_PLANS");

				if (jsonModel.getData().length == 0) {
					MessageBox.error("Você já possui todos os tipos de planos.");
					oView.byId("formDentalInsurance").setVisible(false);
					oView.byId("tOdonto").setVisible(false);
					oView.byId("toolbarList").setVisible(true);
				}

			}

			function fError() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR);
			urlParam = this.fFillURLParamFilter("TYPE", "", urlParam);
			// urlParam = urlParam + "&$expand=PLANS";

			oModel.read("E_SH_HEALTH_PLAN", null, urlParam, false, fSuccess, fError);
		},
		fSearchHelpHealthPlanElekMod: function (brde,bplan) {
			var oView = this.getView();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oData = this.getView().getModel("ET_HEADER").getData();
			var aData = this.getView().getModel("ET_HOLDER");
			var that = this;
			var pltyp = brde;
			var key = bplan;

			var plans = oView.getModel("ET_PLAN_MASTER");

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				var jsonModel = new sap.ui.model.json.JSONModel([]);

				for (var i = 0; i < oEvent.results.length; i++) {
					if (pltyp == oEvent.results[i].PLTYP) {
						jsonModel.getData().push({
							IM_PERNR: oValue.oData[i].IM_PERNR,
							BPLAN: oValue.oData[i].BPLAN,
							LTEXT: oValue.oData[i].LTEXT,
							TYPE: oValue.oData[i].TYPE,
							PLTYP: oValue.oData[i].PLTYP,
						});
					}

				}
			
				that.getView().setModel(jsonModel, "ET_SH_TYPE_PLANS");
				that.byId("ipDentalInsurance").setSelectedKey(key)

				if (jsonModel.getData().length == 0) {
					MessageBox.error("Você já possui todos os tipos de planos.");
					oView.byId("formHealthInsurance").setVisible(false);
					oView.byId("tHealth").setVisible(false);
					oView.byId("toolbarList").setVisible(true);
				}

			}

			function fError() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR);
			urlParam = this.fFillURLParamFilter("TYPE", "", urlParam);
			// urlParam = urlParam + "&$expand=PLANS";

			oModel.read("E_SH_HEALTH_PLAN", null, urlParam, false, fSuccess, fError);
		},
		fFillCreateDentalDataElek: function (oCreate, that, req, newDt) {
			var oView = this.getView();
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var oHolder = that.getView().getModel("ET_HOLDER");
			var oDependents = that.getView().getModel("ET_DEPENDENTS").getData();
			var PLANS_HOLDER = new sap.ui.model.json.JSONModel([]);
			var planData = oView.getModel("ET_PLANS_ELEK");

			for (var i = 0; i < planData.length; i++) {
				if (planData[i].BRDE == "") {
					continue;
				}
				PLANS_HOLDER.getData().push(({
					"REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
					"SUBTY": planData[i].SUBTY,
					"OBJPS": planData[i].OBJPS,
					"BRDE": planData[i].BRDE,
					"LTEXT_BRDE": planData[i].LTEXT_BRDE,
					"BPLAN_BRDE": planData[i].BPLAN_BRDE,
					"ACTIVE_BRDE": planData[i].ACTIVE_BRDE,
					"ACTIO_BRDE": planData[i].ACTIO_BRDE,
					"LTEXT_BRHE": "",
					"BPLAN_BRHE": "",
					"BOPTI_BRHE": planData[i].BOPTI_BRHE,
					"ACTIVE_BRHE": "",
					"ACTIO_BRHE": "",
					"FCNAM": null,
					"TYPE_SAVE": req,
					"SSG_DATE": null

				}));
			}
			oCreate.PLANS_HOLDER = PLANS_HOLDER.getData();
		},
		fCheckChangeElek: function (model) {

			var oModel = this.getView().getModel("ET_PLANS_ORIG");
			var oModelDependents = this.getView().byId(model).getModel().getData();

			for (var i = 0; i < oModelDependents.length; i++) {

				for (var z = 0; z < oModel.length; z++) {

					if (oModelDependents[i].BRDE == oModel[z].BRDE && oModelDependents[i].SUBTY === oModel[z].SUBTY && oModelDependents[i].OBJPS ===
						oModel[z].OBJPS) {

						if (oModelDependents[i].ACTIVE_BRDE === oModel[z].ACTIVE_BRDE) {
							oModelDependents[i].ACTIO_BRDE = "";
						} else {
							if (oModelDependents[i].ACTIVE_BRDE) {
								oModelDependents[i].ACTIO_BRDE = "INS";
							} else {
								oModelDependents[i].ACTIO_BRDE = "DEL";
								this.attachmentRequiredHealth = true;
							}
						}

						// }

					}

				}

			}
		}

		// Fim Elektro

	});
});