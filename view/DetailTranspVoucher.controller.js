sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"cadastralMaintenance/view/BaseController",
	'sap/ui/model/Filter',
	'sap/ui/core/Fragment',
	"cadastralMaintenance/formatter/Formatter",
	"sap/ui/model/json/JSONModel",
], function(Controller, ResourceModel, MessageBox, BaseController, Filter, Fragment, Formatter, JSONModel) {
	"use strict";

	return BaseController.extend("cadastralMaintenance.view.DetailTranspVoucher", {
		onInit: function() {
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();

			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			}
			this.initAttachment();

			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			// this.fSearchHelps();
			this.fSetHeader();
			this.fSetGlobalInformation();
			this.fGetBlock();
			this.fSearchHelpVT(this, this.getView().getModel("ET_HEADER").getData().PERNR);
			this.globalVar();
			this.segButtonHandle(this.getView().getModel("ET_HEADER").getData().BUKRS);
		},

		initialize: function() {
			this.fSetHeader();
			this.fSetGlobalInformation();
			this.fGetBlock();
			this.globalVar();
		},

		segButtonHandle: function(vEmpresa) {
			//var vEmpresa = that.getView().getModel("ET_HEADER").oData.BUKRS;
			if (vEmpresa === "NEO") {
				this.getView().byId("btnSeg").setVisible(this.getView().getModel("ET_GLOBAL_DATA").IM_LOGGED_IN == 0);
			} else {
				this.getView().byId("btnSeg").setVisible(false);
			}
		},

		onVisPressed: function() {
			var oModel = this.getView().getModel("ET_TRANSP");
			var selectedRow = this.fGetSelectedRowDetail();
			// var selectedIndex = this.getView().getModel("ET_ROW").getData().SELECTEDROW;

			if (selectedRow == undefined) {
				MessageBox.error("Selecione uma linha com modificação.");
				this.getView().byId("formGeneral").setVisible(false);
				return;
			}

			if (selectedRow.ACTION == "" || selectedRow.ACTION == undefined) {
				MessageBox.error("Selecione uma linha com modificação.");
				this.getView().byId("formGeneral").setVisible(false);
				return;
			}
			selectedRow.LINHA = selectedRow.TDESC;
			selectedRow.PASS_SOL = selectedRow.TVIAG;
			selectedRow.PASS_APPR = selectedRow.TVIAG;

			this.getView().setModel(new sap.ui.model.json.JSONModel(selectedRow), "ET_DATA_FORM");

			this.getView().byId("ipLinha").setEnabled(false);
			this.getView().byId("formGeneral").setVisible(true);

			if (this.getView().getModel("ET_GLOBAL_DATA").IM_LOGGED_IN == 0) {
				this.getView().byId("ipPassAppr").setVisible(false);
			}

		},

		//	--------------------------------------------
		//	onRowSelectionChange
		//	--------------------------------------------		
		onTranspRowSelectionChange: function(oEvent) {
			// this.fTollbarButtonsController();
			this.onCellClick(oEvent);
		},

		//	--------------------------------------------
		//	onFieldChange
		//	--------------------------------------------		
		onFieldChange: function(oEvent, sField, sKey) {

			var pos;
			var selectedRow;
			//__xmlview3--ipTVIAG-col1-row0
			//__xmlview3--dpEndDate-col3-row1

			selectedRow = this.fGetSelectedRowDetail(this.getView("tTransp").getModel("ET_ROW").getData().SELECTEDROW);

			if (sKey !== undefined) {
				selectedRow.SUBTY = sKey;
			}

			// if (sField === null || sField === undefined) {
			// 	if (oEvent.getParameter("id").search("ipTVIAG") !== -1) {
			// 		pos = 28;
			// 	} else {
			// 		pos = 30;
			// 	}
			// 	selectedRow = this.fGetSelectedRowDetail(oEvent.getParameter("id").substring(pos));
			// }else{
			// 	pos = 29;
			// 	selectedRow = this.fGetSelectedRowDetail(sField.substring(pos));
			// 	selectedRow.SUBTY = sKey;
			// }

			// var fieldName = oEvent.getParameter("id").substring(12);
			// var field = this.getView().byId(fieldName);

			// this.fValidationObligatoryFields(field);

			// if (fieldName.search("ipTVIAG") === 0) {
			if (selectedRow.TVIAG > 99) {
				MessageBox.error("O número máximo de passagens é de 99");
			}
			// }
			if (selectedRow.ACTION !== "INS") {
				selectedRow.ACTION = "MOD";
				selectedRow.STATUS = "Modificado";
			}

			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},
		//	--------------------------------------------
		//	onLinhaChange
		//	--------------------------------------------		
		onLinhaChange: function(oEvent, sField, sKey) {
			var transLine = this.getView().getModel("ET_SH_TRANSP_VOUCHER").getData();
			var newModel = this.getView().getModel("ET_DATA_FORM");
			var linha;

			for (var i = 0; transLine.length > i; i++) {
				if (transLine[i].TRANS === sKey) {
					linha = transLine[i];
					break;
				}
			}

			if (!linha) {
				return;
			}

			newModel.getData().SUBTY = linha.TRANS;
			newModel.getData().TDESC = linha.TDESC;
			newModel.getData().MEIO_TRANS = linha.TTDSC;
			newModel.getData().TARIFA = linha.VALTT;

			this.getView().setModel(new sap.ui.model.json.JSONModel(newModel.getData()), "ET_DATA_FORM");

		},

		//	--------------------------------------------
		//	onAddPressed
		//	--------------------------------------------
		onAddPressed: function() {
			// this.fAddNewLine();
			// this.fRefreshTable();
			// this.getView().byId("btnAccept").setEnabled(true);

			var obj = {
				ACTION: "I"
			};
			var oModel = new sap.ui.model.json.JSONModel(obj);
			this.getView().setModel(oModel, "ET_ACTION");
			this.fNewModel();

			this.getView().byId("formGeneral").setVisible(true);
			this.getView().byId("btnCancelItem").setVisible(true);
			this.getView().byId("btnAcceptItem").setVisible(true);
			this.getView().byId("btnAccept").setVisible(false);
			this.getView().byId("btnForms").setVisible(false);
			this.getView().byId("btnAdd").setEnabled(false);
			this.getView().byId("btnModify").setEnabled(false);
			this.getView().byId("btnRemove").setEnabled(false);
			this.insert = "X";
			this.getView().byId("btnSeg").setEnabled(false);
		},
		onModPressed: function() {
			var obj = {
				ACTION: "M",
				ROW: this.getView().getModel("ET_ROW").getData().SELECTEDROW
			};
			var oModel = new sap.ui.model.json.JSONModel(obj);
			this.getView().setModel(oModel, "ET_ACTION");
			var selectedRow = this.fGetSelectedRowDetail();
			// var selectedIndex = this.getView().getModel("ET_ROW").getData().SELECTEDROW;

			if (selectedRow == undefined) {
				MessageBox.error("Selecione uma linha com modificação.");
				this.getView().byId("formGeneral").setVisible(false);
				return;
			}

			this.fNewModel(selectedRow);
			this.getView().byId("formGeneral").setVisible(true);
			this.getView().byId("btnCancelItem").setVisible(true);
			this.getView().byId("btnAcceptItem").setVisible(true);
			this.getView().byId("btnAccept").setVisible(false);
			this.getView().byId("btnAdd").setEnabled(false);
			this.getView().byId("btnModify").setEnabled(false);
			this.getView().byId("btnRemove").setEnabled(false);
			this.getView().byId("btnSeg").setEnabled(false);
			this.getView().byId("btnVis").setEnabled(false);
			this.modify = "X";

		},

		onRemPressed: function() {

			var oModel = this.getView().getModel("ET_TRANSP");

			// var aData = oModel.getData();

			// aData.splice(selectedIndex, 1);
			// this.fRefreshTable();
			var selectedRow = this.fGetSelectedRowDetail();

			debugger;
			if (selectedRow == undefined) {
				MessageBox.error("Selecione uma linha com modificação.");
				this.getView().byId("formGeneral").setVisible(false);
				return;
			}

			var selectedIndex = this.getView().getModel("ET_ROW").getData().SELECTEDROW;

			// oModel.oData[selectedIndex] = {};
			oModel.oData[selectedIndex].ACTION = "DEL";
			oModel.oData[selectedIndex].STATUS = "Exclusão";
			this.fRefreshTable();

			this.getView().byId("btnRemove").setEnabled(true);
			this.getView().byId("btnAdd").setEnabled(false);
			this.getView().byId("btnModify").setEnabled(false);
			this.getView().byId("btnAccept").setVisible(true);
			this.getView().byId("btnVis").setEnabled(false);
			this.exclude = "X";
		},
		onSegPressed: function() {

			MessageBox.warning("Para segunda solicitar, assinar o formulário.");
			this.getView().byId("btnVis").setEnabled(true);
			this.getView().byId("btnAdd").setEnabled(false);
			this.getView().byId("btnModify").setEnabled(false);
			this.getView().byId("btnAccept").setVisible(false);
			this.getView().byId("btnRemove").setEnabled(false);
			this.getView().byId("btnVis").setEnabled(false);
			this.getView().byId("btnAccept").setVisible(true);
			this.seccond = "X";
		},

		//	--------------------------------------------
		//	fNewModel
		//	--------------------------------------------
		fNewModel: function(selectedRow) {
			// var oModel = this.getView().getModel("ET_TRANSP");
			// var length = oModel.oData.length;

			var oNewLine = {};

			if (selectedRow == undefined) {
				oNewLine.REQUISITION_ID = "";
				oNewLine.SUBTY = "";
				oNewLine.BEGDA = null;
				oNewLine.ENDDA = "9999-12-31T00:00:00";
				oNewLine.ACTION = "INS";
				oNewLine.TDESC = "";
				oNewLine.TVIAG = "";
				oNewLine.ACTIVE_PA = "";
				oNewLine.STATUS = "Novo";
				oNewLine.MEIO_TRANS = "";
				oNewLine.TARIFA = "";
				oNewLine.N_IDA = "";
				oNewLine.N_VOLTA = "";
				this.getView().setModel(new sap.ui.model.json.JSONModel(oNewLine), "ET_DATA_FORM");
			} else {
				oNewLine.REQUISITION_ID = "";
				oNewLine.SUBTY = selectedRow.SUBTY;
				oNewLine.BEGDA = selectedRow.BEGDA;
				oNewLine.ENDDA = "9999-12-31T00:00:00";
				oNewLine.ACTION = "MOD";
				oNewLine.TDESC = selectedRow.TDESC;
				oNewLine.TVIAG = selectedRow.TVIAG;
				oNewLine.ACTIVE_PA = selectedRow.ACTIVE_PA;
				oNewLine.STATUS = "Modificado";
				oNewLine.LINHA = selectedRow.TDESC;
				oNewLine.MEIO_TRANS = "";
				oNewLine.TARIFA = "";
				oNewLine.N_IDA = "";
				oNewLine.N_VOLTA = "";
				this.getView().setModel(new sap.ui.model.json.JSONModel(oNewLine), "ET_DATA_FORM");
				this.onLinhaChange(null, null, selectedRow.SUBTY);
			}

			// oModel.oData[length] = {};
			// oModel.oData[length] = oNewLine;
		},

		//	--------------------------------------------
		//	fAddNewLine
		//	--------------------------------------------
		fAddNewLine: function() {

			var oModel = this.getView().getModel("ET_TRANSP");
			var oModelNew = this.getView().getModel("ET_DATA_FORM");
			var length = oModel.oData.length;

			const ida = parseInt(oModelNew.getData().N_IDA) === NaN ? 0 : parseInt(oModelNew.getData().N_IDA);
			const volta = parseInt(oModelNew.getData().N_VOLTA) === NaN ? 0 : parseInt(oModelNew.getData().N_VOLTA);
			oModelNew.getData().TVIAG = ida + volta;

			oModel.oData[length] = {};
			oModel.oData[length] = oModelNew.getData();

			// var oModel = this.getView().getModel("ET_TRANSP");
			// var length = oModel.oData.length;

			// var oNewLine = {};

			// oNewLine.REQUISITION_ID = "";
			// oNewLine.SUBTY = "";
			// oNewLine.BEGDA = null;
			// oNewLine.ENDDA = "9999-12-31T00:00:00";
			// oNewLine.ACTION = "INS";
			// oNewLine.TDESC = "";
			// oNewLine.TVIAG = "";
			// oNewLine.ACTION = "INS";
			// oNewLine.ACTIVE_PA = "";
			// oNewLine.STATUS = "Novo";

			// oModel.oData[length] = {};
			// oModel.oData[length] = oNewLine;
		},

		//	--------------------------------------------
		//	fTollbarButtonsController
		//	--------------------------------------------		
		fTollbarButtonsController: function() {
			var selectedRow;
			var oView = this.getView();

			if (this.fGetSelectedRow() === true) {
				oView.byId("btnAdd").setVisible(false);
				// oView.byId("btnModify").setVisible(false);
				// oView.byId("btnDelimit").setVisible(false);
				oView.byId("btnRemove").setVisible(false);
				// oView.byId("btnUndo").setVisible(false);

				selectedRow = this.fGetSelectedRowDetail();

				switch (selectedRow.STATUS) {
					case "Novo":
						// oView.byId("btnUndo").setVisible(false);
						oView.byId("btnRemove").setVisible(true);
						break;

					case "":
						// oView.byId("btnModify").setVisible(true);
						// oView.byId("btnDelimit").setVisible(true);
						oView.byId("btnModify").setEnabled(true);
						// oView.byId("btnDelimit").setEnabled(true);
						break;

					default:
						// oView.byId("btnUndo").setVisible(true);
				}

			} else {

				var oModelClosed = this.getView().getModel("ET_CLOSED");

				if (oModelClosed !== undefined) {
					oModelClosed = this.getView().getModel("ET_CLOSED").getData();

					if (oModelClosed.CLOSED === true) {
						oView.byId("btnAdd").setVisible(false);
						// oView.byId("btnModify").setVisible(false);
						oView.byId("btnRemove").setVisible(false);
						// oView.byId("btnUndo").setVisible(false);
						// oView.byId("btnDelimit").setVisible(false);
					}

				} else {
					oView.byId("btnAdd").setVisible(true);
					oView.byId("btnAdd").setEnabled(true);
					// oView.byId("btnModify").setEnabled(false);
					// oView.byId("btnDelimit").setEnabled(false);
					oView.byId("btnRemove").setVisible(false);
					// oView.byId("btnUndo").setVisible(false);
				}

			}

		},

		//	--------------------------------------------
		//	fRefreshTable
		//	--------------------------------------------		
		fRefreshTable: function() {
			var oModel = this.getView().getModel("ET_TRANSP");
			oModel.refresh();

			this.getView().byId("tTransportation").rerender();
		},

		//--------------------------------------------
		//	fGetSelectedRowDetail
		//--------------------------------------------		
		fGetSelectedRowDetail: function(index) {

			var oTable = this.getView().byId("tTransportation");
			var selectedIndex = oTable.getSelectedIndex();
			var oModel = this.getView().getModel("ET_TRANSP").getData();

			if (index !== undefined) {
				return oModel[index];
			} else {
				return oModel[selectedIndex];
			}

		},
		//	--------------------------------------------
		//	fGetSelectedRow
		//	--------------------------------------------	
		fGetSelectedRow: function() {
			//Verify if there is one line selected before continuing
			if (this.getView().byId("tTransportation").getSelectedIndex() < 0) {
				return false; //error
			} else {
				return true; //success
			}
		},

		//	--------------------------------------------
		//	onCellClick
		//	--------------------------------------------		
		onCellClick: function(oEvent) {
			var oRowModel = this.getView().getModel("ET_ROW");
			var row = {};

			if (oRowModel === undefined) {
				oRowModel = new sap.ui.model.json.JSONModel(row);
				row.SELECTEDROW = oEvent.getParameter("rowIndex");
				this.getView().setModel(oRowModel, "ET_ROW");
			} else {
				oRowModel.oData.SELECTEDROW = oEvent.getParameter("rowIndex");
			}

		},

		//--------------------------------------------
		//	fHelpRequest
		//--------------------------------------------		
		fHelpRequest: function(key, descriptionKey, cols, modelName, that, title) {
			//var selectedRow = that.fGetSelectedRowDetail();
			var selectedRowIndex = this.getView().getModel("ET_ROW").getData().SELECTEDROW;
			var selectedRow = this.fGetSelectedRowDetail(selectedRowIndex);

			that._oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				supportRanges: false,
				supportRangesOnly: false,
				supportMultiselect: false,
				key: key,
				descriptionKey: descriptionKey,

				ok: function(oEvent) {
					var aTokens = oEvent.getParameter("tokens");

					if (selectedRow.SUBTY !== aTokens[0].getProperty("key") && selectedRow.ACTION !== "INS") {
						selectedRow.ACTION = "MOD";
						selectedRow.STATUS = "Modificado";
					}

					selectedRow.SUBTY = aTokens[0].getProperty("key");

					var keyCode = "(" + aTokens[0].getProperty("key") + ")";
					selectedRow.TDESC = aTokens[0].getProperty("text").replace(keyCode, "");
					selectedRow.TDESC = selectedRow.TDESC.substring(1, 30);

					that.fRefreshTable();
					this.close();
				},
				cancel: function() {
					this.close();
				}
			});

			//Set columns to the Search Help creation 
			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setData({
				cols: cols
			});

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
		//	onHelpRequestTranspVoucher
		//	--------------------------------------------		
		onHelpRequestTranspVoucher: function() {
			var cols = [{
				label: "Código",
				template: "TRANS"
			}, {
				label: "Descrição do transporte",
				template: "TDESC"
			}];

			this.fHelpRequest("TRANS", "TDESC", cols, "ET_SH_TRANSP_VOUCHER", this, "Transporte");
		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function() {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			this.fSetSearchHelpValue(oModel, "ET_SH_TRANSP_VOUCHER");
		},

		//	--------------------------------------------
		//	fSetSearchHelpValue
		//	--------------------------------------------		
		fSetSearchHelpValue: function(oModel, modelName) {
			var that = this;

			function fSuccessExecutar(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				that.getView().setModel(oValue, modelName);
			}

			function fErrorExecutar(oEvent) {
				console.log("An error occured while reading" + modelName + "!");
			}
			oModel.read(modelName, null, null, false, fSuccessExecutar, fErrorExecutar);
		},

		//	--------------------------------------------
		//	fUpdateBlock
		//	--------------------------------------------		
		fUpdateBlock: function() {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);

			function fSuccess(oEvent) {
				var results = oEvent.results[0];
				var requisitionId;

				that.fSetDataToView(oEvent, that);

				if (results.EX_MESSAGE.TYPE === "W" && results.IM_ACTION !== "A") {
					if ((requisitionId !== null || requisitionId !== "" || requisitionId !== undefined) & requisitionId !== "00000000") {
						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.results[0].EX_MESSAGE.MESSAGE);
						}
					}
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

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oGlobalData.IM_PERNR);
			urlParam = this.fFillURLParamFilter("IM_REQUISITION_ID", oGlobalData.IM_REQ_URL, urlParam);
			urlParam = this.fFillURLParamFilter("IM_LOGGED_IN", oGlobalData.IM_LOGGED_IN, urlParam);
			urlParam = urlParam + "&$expand=TRAN_VOUC";

			oModel.read("ET_TRAN_VOUC", null, urlParam, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function() {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			//var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
			var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);
			debugger;
			function fSuccess(oEvent) {
				var results = oEvent.results[0];
				var requisitionId;

				if (oEvent.results[0].TRAN_VOUC.results.length > 0) {
					requisitionId = oEvent.results[0].TRAN_VOUC.results[0].REQUISITION_ID;
				}

				if (results.OBSERVATION !== undefined && results.OBSERVATION !== "") {
					that.getView().byId("taJust").setValue(results.OBSERVATION);
				}

				that.fSetDataToView(oEvent, that);

				// se tem id verificar os anexos
				if (requisitionId !== "00000000" & requisitionId !== undefined) {
					that.getView().byId("btnForms").setVisible(false);
					that.getView().byId("ipNIda").setVisible(false);
					that.getView().byId("ipNVolta").setVisible(false);
					that.getView().byId("ipPassSol").setVisible(true);
					that.getView().byId("ipPassAppr").setVisible(true);
					that.getView().byId("btnAdd").setVisible(false);
					that.getView().byId("btnModify").setVisible(false);
					that.getView().byId("btnRemove").setVisible(false);
					that.getView().byId("btnSeg").setVisible(false);

					var filters = [];

					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, results.IM_REQUISITION_ID)];

					that.getView().setModel(oModel, "anexo");

				}

				if (results.EX_MESSAGE.TYPE === "W" && results.IM_ACTION !== "A") {
					if ((requisitionId !== null || requisitionId !== "" || requisitionId !== undefined) & requisitionId !== "00000000") {
						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.results[0].EX_MESSAGE.MESSAGE);
						}
					}
				}

				that.fSetGlobalInformation(oEvent, that, requisitionId, true);
				that.fVerifyAction();

				that.getView().byId("btnAccept").setVisible(false);

				if (requisitionId !== "00000000" && requisitionId !== undefined) {
					that.getAttachment(requisitionId, "DOA");
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

			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oGlobalData.IM_PERNR);
			urlParam = this.fFillURLParamFilter("IM_REQUISITION_ID", oGlobalData.IM_REQ_URL, urlParam);
			urlParam = this.fFillURLParamFilter("IM_LOGGED_IN", oGlobalData.IM_LOGGED_IN, urlParam);
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalData.IM_BUKRS, urlParam);
			urlParam = urlParam + "&$expand=TRAN_VOUC";

			oModel.read("ET_TRAN_VOUC", null, urlParam, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fSetDataToView
		//	--------------------------------------------		
		fSetDataToView: function(oEvent, that) {
			var oView = this.getView();
			var oTable = oView.byId("tTransportation");
			var oModelDependentsTable;
			var tableData = [];
			var object = {};
			var editable = false;

			for (var i = 0; i < oEvent.results[0].TRAN_VOUC.results.length; i++) {
				object.REQUISITION_ID = oEvent.results[0].TRAN_VOUC.results[i].REQUISITION_ID;
				object.SUBTY = oEvent.results[0].TRAN_VOUC.results[i].SUBTY;
				object.TDESC = oEvent.results[0].TRAN_VOUC.results[i].TDESC;
				object.TVIAG = oEvent.results[0].TRAN_VOUC.results[i].TVIAG;
				object.BEGDA = oEvent.results[0].TRAN_VOUC.results[i].BEGDA;
				object.ENDDA = oEvent.results[0].TRAN_VOUC.results[i].ENDDA;
				object.ACTION = oEvent.results[0].TRAN_VOUC.results[i].ACTION;
				object.ACTIVE_PA = oEvent.results[0].TRAN_VOUC.results[i].ACTIVE_PA;
				object.SUBTY_OLD = oEvent.results[0].TRAN_VOUC.results[i].SUBTY_OLD;
				object.MEIO_TRANS = oEvent.results[0].TRAN_VOUC.results[i].MEIO_TRANS;
				object.TARIFA = oEvent.results[0].TRAN_VOUC.results[i].TARIFA;
				object.N_IDA = oEvent.results[0].TRAN_VOUC.results[i].N_IDA;
				object.N_VOLTA = oEvent.results[0].TRAN_VOUC.results[i].N_VOLTA;

				if (object.ACTIVE_PA === "X" && object.ACTION === "") {

					object.STATUS = "Ativo";
					editable = false;

				} else {
					editable = true;
					//Data were already modified
					if (object.ACTION === "INS") {
						object.STATUS = "Novo";
					} else if (object.ACTION === "DEL") {
						object.STATUS = "Exclusão";
					} else if (object.ACTION === "MOD") {
						object.STATUS = "Modificado";
					}

				}

				object.ATT_TVIAG = editable;

				tableData[i] = object;
				object = {};
			}

			oModelDependentsTable = new sap.ui.model.json.JSONModel(tableData);
			//GLOBAL MODEL
			that.getView().setModel(oModelDependentsTable, "ET_TRANSP");

			if (tableData.length === 0) {
				oView.byId("btnSave").setEnabled(false);
				oView.byId("btnAccept").setEnabled(false);
				oView.byId("btnCancel").setEnabled(false);

				oView.byId("btnModify").setEnabled(false);
				oView.byId("btnRemove").setEnabled(false);
				oView.byId("btnSeg").setEnabled(false);
			}
		},

		// --------------------------------------------
		// fUnableFields
		// --------------------------------------------  		
		fUnableFields: function() {
			var oView = this.getView();

			oView.byId("UploadCollection").setUploadButtonInvisible(true);
			oView.byId("taJust").setEnabled(false);
		},
		fUnableAllButtons: function() {
			var oView = this.getView();
			oView.byId("btnForms").setVisible(false);
			oView.byId("btnAccept").setVisible(false);
			oView.byId("btnAccept").setEnabled(false);
			oView.byId("btnApprove").setVisible(false);
			oView.byId("btnApprove").setEnabled(false);
			oView.byId("btnCancel").setVisible(false);
			oView.byId("btnCancel").setEnabled(false);
			oView.byId("taJustSSG").setEditable(false);
			oView.byId("btnAdd").setVisible(false);
			oView.byId("btnModify").setVisible(false);
			oView.byId("btnRemove").setVisible(false);
			oView.byId("btnSeg").setVisible(false);
			oView.byId("btnVis").setEnabled(true);
		},
		//	--------------------------------------------
		//	fUpdateTranspVoucher
		//	--------------------------------------------		
		fUpdateTranspVoucher: function(activateBenefit) {
			var oTableModel = this.getView().byId("tTransportation").getModel();

			// for (var i = 0; i < oTableModel.oData.length; i++) {
			// 	oTableModel.oData[i].ACTIVE = activateBenefit;

			// 	if (activateBenefit === "X") {
			// 		oTableModel.oData[i].STATUS = "Ativação será solicitada";
			// 	} else {
			// 		oTableModel.oData[i].STATUS = "Cancelamento será solicitado";
			// 	}
			// }
			oTableModel.refresh();
		},

		// --------------------------------------------
		// fCreateRequisition
		// -------------------------------------------- 
		fCreateRequisition: function(that, action) {
			var oCreate = {};
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var modelTable = this.getView().getModel("ET_TRANSP");
			// var modelTable = this.getView().byId("tTransportation").getModel();
			var TRAN_VOUC = new sap.ui.model.json.JSONModel([]);

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
					case "A":
						MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
						that.fUnableApprovalButtons(that);
						that.fUnableAllButtons(that);
						// *** ANEXO ***
						// that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
						break;

					case "D":
						MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " reprovada!");
						that.fUnableApprovalButtons(that);
						// *** ANEXO ***
						// that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
						break;

					case "S":
						that.fSucessMessageFromSendAction(oEvent);
						// *** ANEXO ***
						// that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
						that.saveAttachment();

						break;

					case "C":
						MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

						/*						if (oGlobalData.IM_REQ_URL !== "") {
						  that.fUnableAllButtons(that);
						} else {
						  that.fGetBlock();
						}*/

						that.fGetBlock();
						// *** ANEXO ***
						// that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
						that.getView().byId("taJust").setValue('');
						// that.fUpdateBlock();
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
						// that.fSetGlobalInformation(oEvent, that, oEvent.EX_REQUISITION_ID, true);
						that.fSetGlobalInformation(oEvent, that, undefined, true);
						// *** ANEXO ***
						// that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
						break;
				}
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

			//MAIN
			oCreate = {
				"IM_ACTION": action,
				"IM_LOGGED_IN": oGlobalData.IM_LOGGED_IN,
				"IM_PERNR": oGlobalData.IM_PERNR,
				"IM_BUKRS": oGlobalData.IM_BUKRS,
				"IM_REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
				"OBSERVATION": that.getView().byId("taJust").getValue()
			};

			for (var i = 0; i < modelTable.oData.length; i++) {
				TRAN_VOUC.getData().push(({
					"REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
					"SUBTY": modelTable.oData[i].SUBTY,
					"TDESC": modelTable.oData[i].TDESC,
					"TVIAG": modelTable.oData[i].TVIAG,
					"BEGDA": modelTable.oData[i].BEGDA,
					"ENDDA": modelTable.oData[i].ENDDA,
					"ACTION": modelTable.oData[i].ACTION,
					"ACTIVE_PA": modelTable.oData[i].ACTIVE_PA,
					"SUBTY_OLD": modelTable.oData[i].SUBTY_OLD,
					"MEIO_TRANS": modelTable.oData[i].MEIO_TRANS,
					"TARIFA": modelTable.oData[i].TARIFA,
					"N_IDA": modelTable.oData[i].N_IDA,
					"N_VOLTA": modelTable.oData[i].N_VOLTA
				}));
			}

			oCreate.TRAN_VOUC = TRAN_VOUC.getData();

			if (oCreate.TRAN_VOUC.length == 0) {
				oCreate.OBSERVATION = "Solicitação referente a segunda solicitação de cartão.";
				oCreate.TRAN_VOUC.push(({
					"REQUISITION_ID": "",
					"SUBTY": "",
					"TDESC": "",
					"TVIAG": "",
					"BEGDA": null,
					"ENDDA": null,
					"ACTION": "",
					"ACTIVE_PA": "",
					"SUBTY_OLD": "",
					"MEIO_TRANS": "",
					"TARIFA": "",
					"N_IDA": "",
					"N_VOLTA": ""
				}));
			}

			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			oModel.create("ET_TRAN_VOUC", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// fActions
		// -------------------------------------------- 		
		fActions: function(that, actionText, action) {
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
				onClose: function(sButton) {
					if (sButton === MessageBox.Action.OK) {
						that.fCreateRequisition(that, action);
						return true;
					}
				}
			});
		},

		// --------------------------------------------
		// onJustChange
		// --------------------------------------------  
		onJustChange: function() {
			var observation = this.getView().byId("taJust").getValue().trim();
			var modelTable = this.getView().byId("tTransportation").getModel();
			var length = modelTable.oData.length;

			if (observation !== "") {
				this.fMessage("None", null, "taJust");
			} else {

				if (length > 0 && modelTable.oData[0].ACTION === "") {
					this.fMessage("Error", "msg_canc_vale_transporte", "taJust");
				} else {
					this.fMessage("None", null, "taJust");
				}
			}
		},

		// --------------------------------------------
		// onSave
		// --------------------------------------------  
		onSave: function() {
			this.fActions(this, "gravação", "R");
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function() {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			var valid = this.validAttachment();

			if (valid === false) {
				return;
			}

			if (this.fVerifyError("taJust") === true) {
				this.handleErrorMessageBoxPress();
			} else {
				MessageBox.confirm(
					message, {
						title: "Termo de responsabilidade",
						initialFocus: sap.m.MessageBox.Action.CANCEL,
						onClose: function(sButton) {
							if (sButton === MessageBox.Action.OK) {
								that.fActions(that, "envio", "S");
							}
						}
					});
			}
		},

		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function() {
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
		onSanitation: function() {

			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			MessageBox.confirm(
				message, {
					title: "Termo de responsabilidade",
					initialFocus: sap.m.MessageBox.Action.CANCEL,
					onClose: function(sButton) {
						if (sButton === MessageBox.Action.OK) {
							that.fActions(that, "saneamento", "X");
						}
					}
				});
		},

		// --------------------------------------------
		// onApprove
		// -------------------------------------------- 		
		onApprove: function() {

			// var dados = this.getView().getModel("ET_DATA_FORM").getData();

			// if (dados.PASS_APPR == "" || dados.PASS_APPR == undefined) {
			// 	this.handleErrorMessageBoxPress();
			// 	return;
			// }

			this.fActions(this, "Aprovação", "A");
		},

		// --------------------------------------------
		// onReject
		// --------------------------------------------  
		onReject: function() {

			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Rejeição", "D");
			}
		},

		//	--------------------------------------------
		//	_handleValueHelpClose 
		//	--------------------------------------------
		_handleValueHelpClose: function(oEvent) {

			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var productInput = this.getView().byId(this.inputId);

				if (oEvent.getSource().data("getParam") != null) {
					if (oEvent.getSource().data("getParam") == "Title") {
						productInput.setValue(oSelectedItem.getTitle());
					} else if (oEvent.getSource().data("getParam") == "Description") {
						productInput.setValue(oSelectedItem.getDescription());
					}
				} else {
					productInput.setValue(oSelectedItem.getTitle());
				}

			}
			oEvent.getSource().getBinding("items").filter([]);

			if (oEvent.getSource().data("lblText") !== "") {
				this.getView().byId(oEvent.getSource().data("lblText")).setText(oSelectedItem.getDescription());
			}

			if (oEvent.getSource().data("input") != null) {
				// this.getView().byId(oEvent.getSource().data("input")).fireChange();
				this.onLinhaChange(oEvent, oEvent.getSource().getParent().getController().inputId, oSelectedItem.getTitle());
			}

		},
		fSearchHelpVT: function(that, pernr) {
			var oEntry = [];
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var oGlobalModel = that.getView().getModel("ET_GLOBAL_DATA");
			var urlParam = "";

			that.Benef = new JSONModel();
			that.Benef.setData({
				table: []
			});

			if (pernr !== undefined && pernr !== null && pernr !== "") {
				urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
			}
			
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalModel.IM_BUKRS, urlParam);

			function fSuccess(oEvent) {

				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				that.getView().setModel(oValue, "ET_SH_TRANSP_VOUCHER");
				// for (var i = 0; i < oEvent.results.length; i++) {
				// 	oEntry = {
				// 		key: oEvent.results[i].BPLAN,
				// 		desc: oEvent.results[i].LTEXT
				// 	};
				// 	that.Benef.getData().table.push(oEntry);

				// 	oEntry = [];
				// }
				// //Seta Lista no Model da View	
				// that.getView().setModel(that.Benef, "benef");
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

			oModel.read("ET_SH_TRANS_LINES", null, urlParam, false, fSuccess, fError);
		},
		onAcceptItem: function() {

			var dados = this.getView().getModel("ET_DATA_FORM").getData();

			if (dados.SUBTY == "" || dados.MEIO_TRANS == "" || dados.TARIFA == "" || (dados.N_IDA == "" && dados.N_VOLTA == "")) {
				this.handleErrorMessageBoxPress();
				return;
			}

			//calculate number of transport lines already included
			var oModel = this.getView().getModel("ET_TRANSP");
			var countIda = 0;
			var countVolta = 0;
			for (let i = 0; i < oModel.oData.length; i++) {
				let item = oModel.oData[i];
				if (item.N_IDA == "") item.N_IDA = "0";
				if (item.N_VOLTA == "") item.N_VOLTA = "0";
				countIda = countIda + parseInt(item.N_IDA);
				countVolta = countVolta + parseInt(item.N_VOLTA);
			}

			if (dados.N_IDA == "") dados.N_IDA = "0";
			if (dados.N_VOLTA == "") dados.N_VOLTA = "0";
			countIda = countIda + parseInt(dados.N_IDA);
			countVolta = countVolta + parseInt(dados.N_VOLTA);

			if (countIda > 4 || countVolta > 4) {
				var oBundle = this.getView().getModel("i18n").getResourceBundle();
				var message = oBundle.getText("maximo_4_linhas");
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				});
				return;
			}

			this.getView().byId("btnAccept").setVisible(true);
			this.getView().byId("btnForms").setVisible(true);
			this.getView().byId("btnCancelItem").setVisible(false);
			this.getView().byId("btnAcceptItem").setVisible(false);
			this.getView().byId("formGeneral").setVisible(false);

			if (this.getView().getModel("ET_ACTION").getData().ACTION == "I") {
				this.fAddNewLine();
				this.getView().byId("btnAdd").setEnabled(true);
			} else if (this.getView().getModel("ET_ACTION").getData().ACTION == "M") {
				this.fEditLine(this.getView().getModel("ET_ACTION").getData().ROW);
				this.getView().byId("btnModify").setEnabled(true);
			}

			this.fRefreshTable();
			this.fClearModelForm();
		},
		fEditLine: function(row) {
			var oModel = this.getView().getModel("ET_TRANSP");
			var oModelNew = this.getView().getModel("ET_DATA_FORM");
			debugger;
			oModelNew.getData().TVIAG = parseInt(oModelNew.getData().N_IDA) + parseInt(oModelNew.getData().N_VOLTA);

			oModel.oData[row] = {};
			oModel.oData[row] = oModelNew.getData();
		},
		onCancelItem: function() {
			const that = this;
			MessageBox.confirm(
				'Suas alterações serão descartadas. Continuar?', {
					title: "Cancelar alterações",
					initialFocus: sap.m.MessageBox.Action.CANCEL,
					onClose: function(sButton) {
						if (sButton === MessageBox.Action.OK) {
							that.initialize();
						}
					}
				});

/*
			//check if there are items already
			var oModel = this.getView().getModel("ET_TRANSP");
			var length = oModel.oData.length;

			if (length) {
				//there are items
				if (this.getView().getModel("ET_ACTION").getData().ACTION == "I") {
					this.getView().byId("btnAdd").setEnabled(true);
				} else if (this.getView().getModel("ET_ACTION").getData().ACTION == "M") {
					this.getView().byId("btnModify").setEnabled(true);
					this.getView().byId("btnRemove").setEnabled(true);
					this.getView().byId("btnSeg").setEnabled(true);
				} else {
					this.getView().byId("btnModify").setEnabled(true);
					this.getView().byId("btnRemove").setEnabled(true);
					this.getView().byId("btnSeg").setEnabled(true);
					this.getView().byId("btnAdd").setEnabled(true);
				}
			} else {
				//if there are no items, clear ET_ACTION model and enable buttons
				var obj = {
					ACTION: ""
				};
				var oModel = new sap.ui.model.json.JSONModel(obj);
				this.getView().setModel(oModel, "ET_ACTION");
				//enable addl button
				this.getView().byId("btnAdd").setEnabled(true);
				//there is no item, so disable modify, remove and second request buttons
				this.getView().byId("btnModify").setEnabled(false);
				this.getView().byId("btnRemove").setEnabled(false);
				this.getView().byId("btnSeg").setEnabled(false);
			}
			this.getView().byId("btnAccept").setVisible(true);
			this.getView().byId("btnForms").setVisible(true);
			this.getView().byId("btnCancelItem").setVisible(false);
			this.getView().byId("btnAcceptItem").setVisible(false);
			this.getView().byId("formGeneral").setVisible(false);
			this.fClearModelForm();
			*/
		},
		fClearModelForm: function() {
			this.getView().setModel(new sap.ui.model.json.JSONModel(), "ET_DATA_FORM");
		},
		onBeforeUpload: function(oEvent) {
			var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
			var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
			var filename = oEvent.getParameter("fileName");
			var caracteristica = "VALETRANSPORTE";

			if (req == '00000000') {
				return;
			}

			// FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
			var dados = filename + ";DOA;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;

			oEvent.getParameters().addHeaderParameter(new sap.m.UploadCollectionParameter({
				name: "slug",
				value: dados
			}));

		},
		onUploadAttComplete: function(oEvent) {
			if (oEvent.mParameters.mParameters.status !== 201) {
				MessageBox.error("Falha ao Salvar Arquivo ..!!");
			} else {
				var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
				this.getAttachment(req, "DOA");
			}
		},
		onFormulario: function() {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_VALE_TRANS_SRV/");
			var url = "ValeTransSet?$filter="
			var indexIda = 0;
			var indexVolta = 0;
			// var block = this.getView().getModel("ET_BLOCK").getData();

			var modelTable = this.getView().getModel("ET_TRANSP");
			var lines = [];
			var valor;

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

			if (modelTable.getData().length == 0 && (this.exclude == "" && this.seccond == "")) {
				MessageBox.error("Realize alguma alteração para imprimir o formulário");
				return;
			}

			const splitLines = (lines) => {
				const newLines = [];
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					let countIda = parseInt(line.N_IDA);
					let countVolta = parseInt(line.N_VOLTA);
					const max = countIda > countVolta ? countIda : countVolta;
					for (let i = 0; i < max; i++) {
						let newLine = Object.assign({}, line);
						newLine.N_IDA = i >= countIda ? "0" : "1";
						newLine.N_VOLTA = i >= countVolta ? "0" : "1";
						newLines.push(newLine);
					}
				}
				return newLines;
			}
			if (this.insert != "") {
				lines = splitLines(modelTable.getData());
				url = url + "FLD01 eq 'X'";

				// var url = "ValeTransSet?$filter=FLD01 eq '1234' and FLD02 eq '123'";
				for (var i = 0; lines.length > i; i++) {
					if (lines[i].ACTION == "INS") {
						switch (indexIda) {
							case 0:
								if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
									url += " and FLD07 eq '" + lines[i].MEIO_TRANS + "' and FLD08 eq '" + lines[i].LINHA + "' and FLD10 eq '" + valor + "'";
									indexIda++;
								}
								break;
							case 1:
								if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
									url += " and FLD13 eq '" + lines[i].MEIO_TRANS + "' and FLD14 eq '" + lines[i].LINHA + "' and FLD16 eq '" + valor + "'";
									indexIda++;
								}
								break;

							case 2:
								if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
									url += " and FLD19 eq '" + lines[i].MEIO_TRANS + "' and FLD20 eq '" + lines[i].LINHA + "' and FLD22 eq '" + valor + "'";
									indexIda++;
								}
								break;

							case 3:
								if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
									url += " and FLD25 eq '" + lines[i].MEIO_TRANS + "' and FLD26 eq '" + lines[i].LINHA + "' and FLD28 eq '" + valor + "'";
									indexIda++;
								}
								break;
							default:
								break;
						}

						switch (indexVolta) {
							case 0:
								if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
									url += " and FLD32 eq '" + lines[i].MEIO_TRANS + "' and FLD33 eq '" + lines[i].LINHA + "' and FLD35 eq '" + valor + "'";
									indexVolta++;
								}
								break;
							case 1:
								if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
									url += " and FLD38 eq '" + lines[i].MEIO_TRANS + "' and FLD39 eq '" + lines[i].LINHA + "' and FLD41 eq '" + valor + "'";
									indexVolta++;
								}
								break;
							case 2:
								if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
									url += " and FLD44 eq '" + lines[i].MEIO_TRANS + "' and FLD45 eq '" + lines[i].LINHA + "' and FLD47 eq '" + valor + "'";
									indexVolta++;
								}
								break;
							case 3:
								if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
									valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
									url += " and FLD50 eq '" + lines[i].MEIO_TRANS + "' and FLD51 eq '" + lines[i].LINHA + "' and FLD53 eq '" + valor + "'";
									indexVolta++;
								}
								break;
							default:
								break;
						}
					}
				}

			} else if (this.modify != "") {
				lines = splitLines(modelTable.getData());

				url = url + "FLD02 eq 'X'";

				for (i = 0; lines.length > i; i++) {
					if (lines[i].ACTION != "INS") {
						if (index == 0) {
							if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
								url += " and FLD07 eq '" + lines[i].MEIO_TRANS + "' and FLD08 eq '" + lines[i].LINHA + "' and FLD10 eq '" + valor + "'";
							}

							if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
								url += " and FLD32 eq '" + lines[i].MEIO_TRANS + "' and FLD33 eq '" + lines[i].LINHA + "' and FLD35 eq '" + valor + "'";
							}

						} else if (index == 1) {
							if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
								url += " and FLD13 eq '" + lines[i].MEIO_TRANS + "' and FLD14 eq '" + lines[i].LINHA + "' and FLD16 eq '" + valor + "'";
							}

							if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
								url += " and FLD38 eq '" + lines[i].MEIO_TRANS + "' and FLD39 eq '" + lines[i].LINHA + "' and FLD41 eq '" + valor + "'";
							}

						} else if (index == 2) {
							if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
								url += " and FLD19 eq '" + lines[i].MEIO_TRANS + "' and FLD20 eq '" + lines[i].LINHA + "' and FLD22 eq '" + valor + "'";
							}

							if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
								url += " and FLD44 eq '" + lines[i].MEIO_TRANS + "' and FLD45 eq '" + lines[i].LINHA + "' and FLD47 eq '" + valor + "'";
							}
						} else if (index == 3) {
							if (lines[i].N_IDA !== "" && lines[i].N_IDA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_IDA);
								url += " and FLD25 eq '" + lines[i].MEIO_TRANS + "' and FLD26 eq '" + lines[i].LINHA + "' and FLD28 eq '" + valor + "'";
							}

							if (lines[i].N_VOLTA !== "" && lines[i].N_VOLTA > 0) {
								valor = parseFloat(lines[i].TARIFA) * parseInt(lines[i].N_VOLTA);
								url += " and FLD50 eq '" + lines[i].MEIO_TRANS + "' and FLD51 eq '" + lines[i].LINHA + "' and FLD53 eq '" + valor + "'";
							}
						}

						index += 1;
					}
				}
			} else if (this.exclude != "") {
				url = url + "FLD03 eq 'X'";
			} else if (this.seccond != "") {
				url = url + "FLD04 eq 'X'";
			}

			// var url = "ValeTransSet?$filter=FLD01 eq '1234' and FLD02 eq '123'";
			//MAIN READ
			oModel.read(url, null, null, false, fSuccess, fError);
		},
		globalVar: function() {
			this.insert = "";
			this.modify = "";
			this.exclude = "";
			this.seccond = "";
		}
	});
});