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
			this.fCheckChange("tOdonto");
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
			// this.getView().byId("columnOpcaoHealth").setVisible(false);
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

					//Sets the models to View
					that.fSetsModels(oEvent, that, isApprover);
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
			// var oTableHealth = that.getView().byId("tHealth");

			//ET_HOLDER Model
			for (var i = 0; i < oResults.length; i++) {

				//HOLDER
				if (oResults[i].SUBTY === "" && oResults[i].OBJPS === "") {
					oModelHolder = oResults[i];
				}
				//Dependents
				else {
					oModelDependents.getData().push(oResults[i]);
				}
			}

			that.getView().setModel(oModelHolder, "ET_HOLDER");
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

			that.addHighlightStyle();

			that.fDental(oModel, that);
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
				jsonModel.getData().push({
					IM_PERNR: "",
					BPLAN: aData.BRDE,
					LTEXT: aData.LTEXT_BRDE,
					TYPE: "",
				});

				for (var i = 0; i < oEvent.results.length; i++) {
					jsonModel.getData().push({
						IM_PERNR: oValue.oData[i].IM_PERNR,
						BPLAN: oValue.oData[i].BPLAN,
						LTEXT: oValue.oData[i].LTEXT,
						TYPE: oValue.oData[i].TYPE,
					});
				}

				that.getView().setModel(jsonModel, "ET_SH_TYPE_PLANS");
				that.byId("ipDentalInsurance").setSelectedKey(aData.BPLAN_BRDE)
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

			that.fFillCreateHealthData(oCreate, that, req, newDt);

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

			if(oHolder.ACTIVE_BRDE == "" || oHolder.ACTIVE_BRDE == undefined){
				oHolder.ACTIVE_BRDE = "X";
			}

			// titular
			PLANS_HOLDER.getData().push(({
				"REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
				"SUBTY": oHolder.SUBTY,
				"OBJPS": oHolder.OBJPS,
				"BRDE": oHolder.BRDE,//,
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

			if(attachment == false){
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
			}

			else {
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
				that.byId("slHealthInsuranceAccommodation").setSelectedKey(aData.BOPTI_BRHE)

			}

			function fErrorOpt() {
				console.log("Erro ao ler Ajudas de Pesquisa");
			}

			var urlParam = this.fFillURLParamFilter("IM_BPLAN", aData.BPLAN_BRDE);
			urlParam = this.fFillURLParamFilter("IM_PERNR", oData.PERNR, urlParam);

			oModel.read("ET_SH_ACCOMMODATION", null, urlParam, false, fSuccessOpt, fErrorOpt);
		},

	});
});