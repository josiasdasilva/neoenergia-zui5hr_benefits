sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "cadastralMaintenance/view/BaseController",
  "sap/m/UploadCollectionParameter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "cadastralMaintenance/formatter/Formatter"
], function(Controller, ResourceModel, JSONModel, MessageBox, BaseController, UploadCollectionParameter, Filter, FilterOperator,
  Formatter) {
    "use strict";
    
    return BaseController.extend("cadastralMaintenance.view.DetailMealAllowance", {
      onInit: function() {
        this.oInitialLoadFinishedDeferred = jQuery.Deferred();
        this.novoVale = false;
        if (sap.ui.Device.system.phone) {
          //Do not wait for the master2 when in mobile phone resolution
          this.oInitialLoadFinishedDeferred.resolve();
        } else {
          var oEventBus = this.getEventBus();
          // oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
        }
        var oModel = new JSONModel();
        this.getView().setModel(oModel, "Attachments");
        
        var oUploadCollection = this.getView().byId("UploadCollection");
        if (oUploadCollection) {
          oUploadCollection.setUploadUrl("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/AnexoSet");
        }
        
        this.getView().setModel(new JSONModel({
          "selected": ["jpg", "txt", "ppt", "doc", "xls", "pdf", "png", "docx", "xlsx"]
        }), "uploadOptions");
        
        this.getRouter().attachRouteMatched(this.onRouteMatched, this);
        
        this.fSetHeader();
        this.fSetGlobalInformation();
        this.fGetBlock();
        this.fGetAllowance();
        this.fSetScreen();
      },
      
      //	--------------------------------------------
      //	fGetBlock
      //	--------------------------------------------		
      fGetBlock: function() {
        var that = this;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
        
        var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
        
        // var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
        var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);
        
        function fSuccess(oEvent) {
          var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
          
          that.getView().setModel(oValue, "ET_BLOCK");
          
          that.fSetEffectiveDateTextMeal();
          that.fSetMealFlag(that);
          
          that.getView().byId("taJust").setValue(oEvent.OBSERVATION);
          
          if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
            that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
            that.getView().byId("formJustificationSSG").setVisible(true);
          }
          
          // se tem id verificar os anexos
          if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
            // that.getAttachment(oEvent.BLOCK.REQUISITION_ID);
            // var filters = [];
            
            // filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];
            
            // that.getView().setModel(oModel, "anexo");
            
            // // Update list binding
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
            that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "DOA");
            that.getView().byId("btnForms").setVisible(false);
          }
          
          // Validaçao campos
          if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.BLOCK.REQUISITION_ID === "00000000") {
            that.getView().byId("btnForms").setEnabled(false);
            that.getView().byId("btnAccept").setEnabled(false);
            that.getView().byId("idCombo").setEnabled(false);
            that.getView().byId("taJust").setEnabled(false);
            that.getView().byId("taJustSSG").setEnabled(false);
            that.getView().byId("btnSanity").setEnabled(false);
            that.getView().byId("btnSave").setEnabled(false);
            that.getView().byId("btnCancel").setEnabled(false);
            that.getView().byId("btnApprove").setEnabled(false);
            that.getView().byId("btnReject").setEnabled(false);
            MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
            
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
        oModel.read("ET_MEAL_ALLOWANCE" + urlParam, null, null, false, fSuccess, fError);
      },
      
      identificationText_100VA: function() {
        return '100% Vale Alimentação';
      },
      identificationText_100VR: function() {
        return '100% Vale Refeição';
      },
      identificationText_50VR_50VA: function() {
        return '50% Vale Alimentação/50% Refeição';
      },
      //	--------------------------------------------
      //	fGetBlock
      //	--------------------------------------------		
      fGetAllowance: function() {
        var that = this;
        var oEntry = [];
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
        var oGlobalModel = this.getView().getModel("ET_GLOBAL_DATA");
        var lPernr = this.getView().getModel("ET_HEADER").oData.PERNR;
        that.empresa = this.getView().getModel("ET_HEADER").oData.BUKRS;
        var urlParam = "?$filter=Pernr eq '" + lPernr + "'";
        
        urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalModel.IM_BUKRS, urlParam);
        
        this.Benef = new JSONModel();
        this.Benef.setData({
          table: []
        });
        
        function fSuccess(oEvent) {
          
          for (var i = 0; i < oEvent.results.length; i++) {
            oEntry = {
              key: oEvent.results[i].Idac,
              desc: oEvent.results[i].Nmac
            };
            if (oEntry.key === 'ALIM') {
              oEntry.desc = 'Alimentação';
            }
            if (oEntry.key === 'REFE') {
              oEntry.desc = 'Refeição';
            }
            that.Benef.getData().table.push(oEntry);
            
            oEntry = [];
          }
          //Seta Lista no Model da View	
          that.getView().setModel(that.Benef, "benef");
          
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
        oModel.read("ET_BENEF_EMP" + urlParam, null, null, false, fSuccess, fError);
        
      },
      
      //	--------------------------------------------
      //	fVerifyChange
      //	--------------------------------------------		
      fVerifyChange: function(that, key) {
        var currentModel = that.getView().getModel("ET_BLOCK");
        var vEmpresa = that.getView().getModel("ET_HEADER").oData.BUKRS;
        
        if (this.getView().byId("idAli").getValue() !== "") {
          var vAli = parseInt(this.getView().byId("idAli").getValue());
        } else {
          vAli = 0;
        }
        
        if (this.getView().byId("idRef").getValue() !== "") {
          var vRef = parseInt(this.getView().byId("idRef").getValue());
        } else {
          vRef = 0;
        }
        
        var total = vAli + vRef;
        
        if (currentModel.getData() !== undefined) {
          currentModel = currentModel.getData();
          
          if (currentModel.BPLAN !== key) {
            if (vEmpresa === "NEO") {
              that.getView().byId("btnAccept").setEnabled(true);
              that.getView().byId("btnForms").setEnabled(true);
            } else {
              
              if (total !== 100) {
                //MessageBox.show("Percentual dos Planos deve ser 100%");
                that.getView().byId("btnAccept").setEnabled(false);
                that.getView().byId("btnForms").setEnabled(false);
              } else {
                that.getView().byId("btnAccept").setEnabled(true);
                that.getView().byId("btnForms").setEnabled(true);
              }
            }
          } else {
            if (vEmpresa === "NEO") {
              that.getView().byId("btnAccept").setEnabled(false);
              that.getView().byId("btnForms").setEnabled(false)
            } else {
              if (total !== 100) {
                that.getView().byId("btnAccept").setEnabled(false);
                that.getView().byId("btnForms").setEnabled(false);
              } else {
                that.getView().byId("btnAccept").setEnabled(true);
                that.getView().byId("btnForms").setEnabled(true);
              }
            }
          }
        }
      },
      
      //	--------------------------------------------
      //	fFormatDate - YYYY-MM-DDT:00:00
      //	--------------------------------------------		
      fFormatDate: function(date) {
        var day = date.substring(8, 10);
        var month = date.substring(5, 7);
        var year = date.substring(0, 4);
        
        return day + "." + month + "." + year;
      },
      
      //	--------------------------------------------
      //	fSetEffectiveDateTextMeal
      //	--------------------------------------------		
      fSetEffectiveDateTextMeal: function() {
        var aData = this.getView().getModel("ET_BLOCK").getData();
        var textRefectoryUnit;
        var textRefectoryFixed;
        var textFoodStamp;
        var textMealOption;
        var formattedDate;
        var space = " ";
        
        function fSetAction(dateField, activeField) {
          if (aData[dateField] !== null) {
            if (aData[activeField] === "") {
              return "Delimitação";
            } else {
              return "Inclusão";
            }
            
          }
        }
        
        if (aData !== undefined) {
          textRefectoryUnit = fSetAction("EFFECTIVE_DATE_BRRE", "ACTIVE_BRRE");
          textRefectoryFixed = fSetAction("EFFECTIVE_DATE_BRRF", "ACTIVE_BRRF");
          textFoodStamp = fSetAction("EFFECTIVE_DATE_BRVA", "ACTIVE_BRVA");
          textMealOption = fSetAction("EFFECTIVE_DATE_BRVR", "ACTIVE_BRVR");
          
          //Refeitório Valor Unitário
          if (textRefectoryUnit !== undefined) {
            formattedDate = this.fFormatDate(aData.EFFECTIVE_DATE_BRRE);
            textRefectoryUnit = textRefectoryUnit + ":" + space + formattedDate;
            //Clear
            formattedDate = undefined;
          }
          
          //Refeitório Valor Fixo
          if (textRefectoryFixed !== undefined) {
            formattedDate = this.fFormatDate(aData.EFFECTIVE_DATE_BRRF);
            textRefectoryFixed = textRefectoryFixed + ":" + space + formattedDate;
            //Clear
            formattedDate = undefined;
          }
          
          //Vale Alimentação
          if (textFoodStamp !== undefined) {
            formattedDate = this.fFormatDate(aData.EFFECTIVE_DATE_BRVA);
            textFoodStamp = textFoodStamp + ":" + space + formattedDate;
            //Clear
            formattedDate = undefined;
          }
          
          //Vale Refeição
          if (textMealOption !== undefined) {
            formattedDate = this.fFormatDate(aData.EFFECTIVE_DATE_BRVR);
            textMealOption = textMealOption + ":" + space + formattedDate;
            //Clear
            formattedDate = undefined;
          }
        }
        
        var oCreateEffectDate = {};
        oCreateEffectDate.DATE_BRVR = textMealOption;
        oCreateEffectDate.DATE_BRVA = textFoodStamp;
        oCreateEffectDate.DATE_BRRE = textRefectoryUnit;
        oCreateEffectDate.DATE_BRRF = textRefectoryFixed;
        
        var oModelEffectDate = new sap.ui.model.json.JSONModel(oCreateEffectDate);
        this.getView().setModel(oModelEffectDate, "ET_EFFECT");
        
      },
      
      // --------------------------------------------
      // fSetMealFlag
      // -------------------------------------------- 		
      fSetMealFlag: function(that) {
        var vEmpresa = that.getView().getModel("ET_HEADER").oData.BUKRS;
        var oModel = that.getView().getModel("ET_BLOCK");
        var oCombo = that.getView().byId("idCombo");
        if (oModel !== undefined) {
          var aData = oModel.getData();
          
          if (vEmpresa === "NEO") {
            that.getView().byId("idCombo").setSelectedKey(aData.BPLAN);
          } else {
            if (aData.BPLAN === 'ALIM') {
              //	that.getView().byId("idAli").setValue(aData.PERC_ALI);
              that.getView().byId("idRadio").setSelectedIndex(0);
            } else {
              //	that.getView().byId("idRef").setValue(aData.PERC_REF);
              that.getView().byId("idRadio").setSelectedIndex(1);
            }
            that.getView().byId("idAli").setValue(aData.PERC_ALI);
            that.getView().byId("idRef").setValue(aData.PERC_REF);
            
          }
          
        }
        
        if (aData.BPLAN == "") {
          this.novoVale = true;
        }
        
      },
      
      // --------------------------------------------
      // fFillCreateMealAllowanceData
      // -------------------------------------------- 		
      fFillCreateMealAllowanceData: function(oCreate, that) {
        
        var vEmpresa = that.getView().getModel("ET_HEADER").oData.BUKRS;
        var vBplan = that.getView().byId("idCombo").getSelectedKey();
        
        if (vEmpresa === "NEO") {
          
          oCreate.BLOCK.BPLAN = vBplan;
          oCreate.BLOCK.LEVEL1 = vBplan;
          
        } else {
          if (this.getView().byId("idAli").getValue() !== "") {
            
            var vPerc_ali = parseInt(this.getView().byId("idAli").getValue());
            
          } else {
            vPerc_ali = 0;
          }
          
          if (this.getView().byId("idRef").getValue() !== "") {
            
            var vPerc_Ref = parseInt(this.getView().byId("idRef").getValue());
            
          } else {
            vPerc_Ref = 0;
          }
          
          if (that.getView().byId("REFE").getSelected()) {
            vBplan = "REFE";
          } else {
            vBplan = "ALIM";
          }
          
          oCreate.BLOCK.BPLAN = vBplan;
          oCreate.BLOCK.LEVEL1 = 'EKT';
          oCreate.BLOCK.PERC_ALI = vPerc_ali;
          oCreate.BLOCK.PERC_REF = vPerc_Ref;
          
        }
        
      },
      
      // --------------------------------------------
      // fCreateRequisition
      // -------------------------------------------- 
      fCreateRequisition: function(that, action) {
        
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
        
        that.fFillCreateMealAllowanceData(oCreate, that);
        
        //SUCESSO
        function fSuccess(oEvent) {
          debugger;
          oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;
          
          switch (action) {
            case "A":
            MessageBox.success("Aprovação realizada com sucesso!");
            that.fVerifyAction(false, "A");
            break;
            
            case "S":
            that.fSucessMessageFromSendAction(oEvent);
            that.fVerifyAction(false, "S");
            // *** ANEXO ***
            that.saveAttachment();
            that.setDocumentStatus(oGlobalData.IM_REQUISITION_ID,action,"DOA");
            break;
            
            case "C":
            MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");
            
            that.fGetBlock();
            
            var oUploadCollection = that.getView().byId("upldAttachments");
            oUploadCollection.destroyItems();
            that.fVerifyAction(false, "C");
            // *** ANEXO ***
            // that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
            break;
            
            case "R":
            MessageBox.success(
              "Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
              );
              
              that.fSetGlobalInformation(oEvent, that);
              that.fVerifyAction(false, "R");
              
              // *** ANEXO ***
              // that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
              
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
          oModel.create("ET_MEAL_ALLOWANCE", oCreate, null, fSuccess, fError);
        },
        
        //	--------------------------------------------
        //	fUnableFields
        //	--------------------------------------------		
        fUnableFields: function() {
          var empresa = this.getView().getModel("ET_HEADER").oData.BUKRS;
          var oView = this.getView();
          
          if (empresa === 'NEO') {
            oView.byId("idCombo").setEnabled(false);
          } else {
            this.getView().byId("idRadio").setEditable(false);
            this.getView().byId("idAli").setEditable(false);
            this.getView().byId("idRef").setEditable(false);
          }
          
          oView.byId("taJust").setEnabled(false);
          oView.byId("UploadCollection").setUploadButtonInvisible(true);
        },
        
        //	--------------------------------------------
        //	fUnableAllButtons
        //	--------------------------------------------			
        fUnableAllButtons: function() {
          var oView = this.getView();
          
          //	oView.byId("btnSave").setEnabled(false);
          oView.byId("btnForms").setVisible(false);
          oView.byId("btnApprove").setVisible(false);
          oView.byId("btnAccept").setVisible(false);
          oView.byId("btnCancel").setVisible(false);
        },
        
        //	--------------------------------------------
        //	onMealAllowanceSelect
        //	--------------------------------------------		
        onMealAllowanceSelect: function(oEvent) {
          var fieldname = oEvent.getParameter("id").substring(12);
          var key = oEvent.mParameters.selectedItem.mProperties.key;
          
          this.fVerifyChange(this, key);
        },
        
        onChangeRb: function(oEvent) {
          
          if (oEvent.getParameter("selectedIndex") === 0) {
            var key = "ALIM";
          } else {
            key = "REFE";
          }
          
          this.fVerifyChange(this, key);
        },
        
        fSetScreen: function() {
          var oBenef = this.getView().getModel("benef");
          var empresa = this.getView().getModel("ET_HEADER").oData.BUKRS;
          var hBoxNeo = this.getView().byId("formMeal");
          var hBoxEkt = this.getView().byId("formMealEkt");
          
          if (empresa === "NEO") {
            hBoxNeo.setVisible(true);
            hBoxEkt.setVisible(false);
          } else {
            hBoxNeo.setVisible(false);
            
            var aData = oBenef.getData();
            if (aData.table.length > 0) {
              if ((aData.table[0].key !== 'VALI' && aData.table[1].key !== 'REFE')) {
                //( aData.table[1].key !== 'VALI' && aData.table[0].key !== 'REFE' ) ) {
                hBoxEkt.setVisible(false);
              } else {
                hBoxEkt.setVisible(true);
              }
            } else {
              hBoxEkt.setVisible(false);
            }
          }
          
        },
        
        //	--------------------------------------------
        //	fModifyModel
        //	--------------------------------------------		
        fModifyModel: function(fieldname) {},
        
        onLiveChange: function(e) {
          var idInput = e.getParameter("id");
          
          idInput = idInput.replace('__xmlview3--', '');
          
          // if (oModel !== undefined) {
          // 	var aData = oModel.getData();
          this.validaPercent();
          
        },
        validaPercent: function() {
          var oModel = this.getView().getModel("ET_BLOCK");
          
          if (this.getView().byId("idAli").getValue() !== "") {
            var vAli = parseInt(this.getView().byId("idAli").getValue());
          } else {
            vAli = 0;
          }
          
          if (this.getView().byId("idRef").getValue() !== "") {
            var vRef = parseInt(this.getView().byId("idRef").getValue());
          } else {
            vRef = 0;
          }
          
          /*						if (total !== 100) {
            //MessageBox.show("Percentual dos Planos deve ser 100%");
            that.getView().byId("btnAccept").setEnabled(false);
            that.getView().byId("btnForms").setEnabled(false);
          } else {
            that.getView().byId("btnAccept").setEnabled(true);
            that.getView().byId("btnForms").setEnabled(true);
          }
          */
          var total = vAli + vRef;
          if (total !== 100) {
            this.getView().byId("btnAccept").setEnabled(false);
            this.getView().byId("btnForms").setEnabled(false);
            MessageBox.error("Soma dos percentuais tem que ser 100%");
            return false;
          } else {
            this.getView().byId("btnAccept").setEnabled(true);
            this.getView().byId("btnForms").setEnabled(true);
          }
          return true;
        },
        
        // --------------------------------------------
        // onSend
        // --------------------------------------------  
        onSend: function() {
          
          var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
          var oBundle = this.getView().getModel("i18n").getResourceBundle();
          
          if (this.fObligatoryFields() == false) {
            return;
          }
          
          // if (empresa != "NEO") {
          // 	if (this.validaPercent() === false) {
          // 		return;
          // 	}
          // }
          
          if (this.getView().byId("UploadCollection").getItems().length === 0) {
            MessageBox.error(oBundle.getText("erro_anexo_obrigatorio"));
            return;
          }
          
          this.fActions(this, "envio", "S");
        },
        
        // --------------------------------------------
        // onSend
        // --------------------------------------------  
        onApprove: function() {
          this.fActions(this, "aprovar", "A");
        },
        
        // --------------------------------------------
        // onSave
        // --------------------------------------------  
        onSave: function() {
          this.fActions(this, "gravação", "R");
        },
        
        // --------------------------------------------
        // onCancel
        // -------------------------------------------- 		
        onCancel: function() {
          var justSSG = this.getView().byId("taJustSSG").getValue();
          if (justSSG === "") {
            MessageBox.error("É obrigatório informar o Motivo do cancelamento");
          } else {
            this.fActions(this, "cancelamento", "C");
          }
        },
        
        // getAttachment: function (requisition) {
        // 	var that = this;
        // 	var path = "/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/";
        // 	var oModelData = new sap.ui.model.odata.ODataModel(path);
        
        // 	var oFilters = [];
        
        // 	if (requisition == '00000000') {
        // 		return;
        // 	}
        
        // 	requisition = "'" + requisition + "'";
        
        // 	var doctype = "DOA";
        
        // 	oFilters.push(new Filter("ReqNumber", FilterOperator.EQ, requisition));
        // 	oFilters.push(new Filter("DocType", sap.ui.model.FilterOperator.EQ, doctype));
        
        // 	oModelData.read("/AnexoSet", {
        // 		filters: oFilters,
        // 		async: false,
        // 		success: function (oData) {
        // 			var oAttachments = that.getView().getModel("Attachments");
        // 			oAttachments.setData(null);
        // 			oAttachments.setData({
        // 				table: []
        // 			});
        
        // 			if (oData.results.length > 0) {
        // 				var options = that.getView().getModel("uploadOptions");
        // 				options.getData().uploadEnabled = false;
        // 				options.refresh();
        // 			}
        
        // 			for (var i = 0; i < oData.results.length; i++) {
        // 				var oDataResult = oData.results[i];
        // 				var oEntry = {};
        
        // 				oEntry.documentId = oDataResult.DocumentId;
        // 				oEntry.Filename = oDataResult.Filename;
        // 				oEntry.Mimetype = oDataResult.Mimetype;
        // 				oEntry.version = oDataResult.Version;
        // 				oEntry.Fileid = oDataResult.Fileid;
        // 				oEntry.Url = path + "/AnexoSet(Pernr='',Data='" + "20200101" +
        // 					"',DocumentId='" + oEntry.documentId + "',Version='" + "AA',Fileid='" + oEntry.Fileid + "',DocType='" + doctype +
        // 					"')/$value";
        // 				oEntry.Response = oDataResult.Response;
        // 				oEntry.TipoAnexo = oDataResult.TipoAnexo;
        // 				oEntry.Delete = false;
        // 				// oAttachments.table.push(oEntry);
        
        // 				oAttachments.getData().table.push(oEntry);
        // 			}
        // 			oAttachments.refresh();
        
        // 		},
        // 		error: function (e) {
        // 			// MessageBox.error("Erro ao Ler anexos.");
        // 		}
        // 	});
        
        // },
        onFilenameLengthExceed: function(oEvent) {
          MessageBox.error("Nome do Arquivo muito longo, max. 50 caracteres");
        },
        onFileSizeExceed: function(oEvent) {
          
          MessageBox.error("Arquivo excede tamanho máximo de 1MB");
        },
        saveAttachment: function() {
          var oUploadCollection = this.getView().byId("UploadCollection");
          oUploadCollection.upload();
        },
        
        onBeforeUpload: function(oEvent) {
          
          var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
          var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
          var filename = oEvent.getParameter("fileName");
          const uploadCollection = this.getView().byId("UploadCollection");
          const conta_anexos =  uploadCollection.getItems().length;
          
          if (req == '00000000') {
            return;
          }
          
          var dados = "";
          if(this.settingStatus){
            dados = "BENEFICIOS;DOA;" + req + ";STATUS;" + conta_anexos + ";S;" + pernr;
          }else{
            // FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
            dados = filename + ";DOA;" + req + ";INSERT;" + "VALE;" + "S" + ";" + pernr;
          }
          oEvent.getParameters().addHeaderParameter(new sap.m.UploadCollectionParameter({
            name: "slug",
            value: dados
          }));
          
        },
        
        onChangeAttachment: function(oEvent) {
          var csrfToken = this.getView().getModel().getSecurityToken();
          var oUploadCollection = oEvent.getSource();
          
          if (oUploadCollection.getItems().length >= 1) {
            
            // MessageBox.error("É permitido apenas 1 arquivo para Envio");
            
          } else {
            
            // Header Token
            var oCustomerHeaderToken = new UploadCollectionParameter({
              name: "x-csrf-token",
              value: csrfToken
            });
            
            oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
            
          }
        },
        onUploadComplete: function(oEvent) {
          if (oEvent.mParameters.mParameters.status !== 201) {
            MessageBox.error("Falha ao Salvar Arquivo ..!!");
          } else {
            var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
            this.getAttachment(req, "DOA");
          }
        },
        onFormulario: function() {
          const oModelBenef = this.getView().getModel("benef");
          var sServiceUrl = "/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/";
          var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
          var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
          var type = "";
          var operation = "";
          var complements = "";
          
          if (this.fObligatoryFields() == false) {
            return;
          }
          
          if (this.novoVale === true) {
            operation = 'I';
          } else {
            operation = 'A';
          }
          
          if (empresa === "NEO") {
            const combo = this.getView().byId("idCombo").getSelectedItem().getKey();
            //identify selection in benef model
            for (let i = 0; i < oModelBenef.oData.table.length; i++) {
              const benef = oModelBenef.oData.table[i];
              if (benef.key === combo) {
                switch (benef.desc) {
                  case this.identificationText_100VA():
                  type = "A";
                  break;
                  case this.identificationText_100VR():
                  type = "R";
                  break;
                  case this.identificationText_50VR_50VA():
                  type = "AR";
                  break;
                  default:
                  break;
                }
              }
            }
            
            //if (combo == "VALI" || combo == "VAES" || combo == "VA02" || combo == "VAE2") {
            //	type = "A";
            //} else if (combo == "VREF" || combo == "VRES" || combo == "VR02" || combo == "VRE2") {
            //	type = "R";
            //} else if (combo == "VAVR" || combo == "VARE" || combo == "VAR2" || combo == "ARE2") {
            //	type = "AR";
            //}
          } else {
            var radioBtn = this.getView().byId("idRadio").getSelectedIndex();
            
            if (radioBtn === 0) {
              type = "A";
            } else {
              type = "R";
            }
            
            complements = this.getView().byId("idAli").getValue() + ";" + this.getView().byId("idRef").getValue();
            
          }
          var sRead = "/ET_FORMS(FORMNAME='VALEALIMENTACAO',PERNR='" + pernr + "',TYPE='" + type + "',OPERATION='" + operation +
          "',COMPLEMENTS='" + complements + "')";
          var pdfURL = sServiceUrl + sRead + "/$value";
          window.open(pdfURL);
          
        },
        fObligatoryFields: function() {
          var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
          if (empresa === "NEO") {
            if (this.getView().byId("idCombo").getSelectedItem() == null || this.getView().byId("idCombo").getSelectedItem() == undefined) {
              this.handleErrorMessageBoxPress();
              return false;
            }
          } else {
            return this.validaPercent();
          }
          
          return true;
        }
      });
      
    });