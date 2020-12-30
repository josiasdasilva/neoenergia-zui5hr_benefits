sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "cadastralMaintenance/view/BaseController",
  "cadastralMaintenance/formatter/Formatter",
  "sap/ui/model/json/JSONModel",
], function(Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel) {
  "use strict";
  
  return BaseController.extend("cadastralMaintenance.view.DetailVehicleFinan", {
    onInit: function() {
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
    fGetBlock: function() {
      var that = this;
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
      
      var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
      
      var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
      
      function fSuccess(oEvent) {
        
        var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
        
        // Impedir gerar mais de uma solicitação para o mesmo colaborador | TIAGO
        if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A" &
        (oGlobalData.IM_REQ_URL === "00000000" || oGlobalData.IM_REQ_URL === null ||
        oGlobalData.IM_REQ_URL === "" || oGlobalData.IM_REQ_URL === undefined)
        ) {
          that.getView().byId("dtValidFrom").setEnabled(false);
          that.getView().byId("dtValidTo").setEnabled(false);
          that.getView().byId("ipAppValue").setEnabled(false);
          that.getView().byId("ipRequestedValue").setEnabled(false);
          that.getView().byId("dtDateCred").setEnabled(false);
          that.getView().byId("taJust").setEnabled(false);
          
          that.getView().byId("dtValidFrom").setValue(oEvent.BLOCK.VALID_FROM);
          that.getView().byId("dtValidTo").setValue(oEvent.BLOCK.VALID_TO);
          that.getView().byId("dtDateCred").setValue(oEvent.BLOCK.DATE_CRED);
          that.getView().byId("ipRequestedValue").setValue(oEvent.BLOCK.VALUE_SOL);
          
          MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
          return;
        }
        
        if (oGlobalData.IM_LOGGED_IN === 0) {
          that.getView().byId("btnForms").setVisible(true);
          that.getView().setModel(new sap.ui.model.json.JSONModel({
            VALUE_MAX: oEvent.BLOCK.VALUE_MAX
          }), "ET_BLOCK");
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
          var data = oEvent.BLOCK.VALID_FROM;
          var ano = data.substring(0, 4);
          var mes = data.substring(4, 6);
          that.getView().byId("dtValidFrom").setDateValue(new Date(ano, mes - 1));
          // var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
          // that.getView().byId("dtValidFrom").setValue(dataF);
          
          data = oEvent.BLOCK.VALID_TO;
          ano = data.substring(0, 4);
          mes = data.substring(4, 6);
          that.getView().byId("dtValidTo").setDateValue(new Date(ano, mes - 1));
          // dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
          // that.getView().byId("dtValidTo").setValue(dataF);
          
          data = oEvent.BLOCK.DATE_CRED;
          var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
          that.getView().byId("dtDateCred").setValue(dataF);
          
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
      oModel.read("ET_VEHICLE_FINAN" + urlParam, null, null, false, fSuccess, fError);
    },
    
    //	--------------------------------------------
    //	fUnableFields
    //	--------------------------------------------		
    fUnableFields: function() {
      var oView = this.getView();
      //oView.byId("UploadCollection").setUploadButtonInvisible(true);
      oView.byId("dtValidFrom").setEnabled(false);
      oView.byId("dtValidTo").setEnabled(false);
      oView.byId("ipAppValue").setEnabled(false);
      oView.byId("ipRequestedValue").setEnabled(false);
      oView.byId("dtDateCred").setEnabled(false);
      oView.byId("taJust").setEnabled(false);
    },
    
    //	--------------------------------------------
    //	fUnableAllButtons
    //	--------------------------------------------			
    fUnableAllButtons: function() {
      var oView = this.getView();
      
      // oView.byId("btnSave").setEnabled(false);
      oView.byId("btnForms").setVisible(false);
      oView.byId("btnApprove").setVisible(false);
      oView.byId("btnAccept").setVisible(false);
      oView.byId("btnCancel").setVisible(false);
    },
    
    //	--------------------------------------------
    //	fVerifyChange
    //	--------------------------------------------		
    fVerifyChange: function(that) {
      
      if (parseFloat(this.getView().byId("ipRequestedValue").getValue()) <= 0 || this.getView().byId("dtValidFrom").getValue() == "" ||
      this.getView().byId("dtValidTo").getValue() == "" || this.getView().byId("dtDateCred").getValue() == "") {
        that.getView().byId("btnAccept").setEnabled(false);
      } else {
        that.getView().byId("btnAccept").setEnabled(true);
      }
      
    },
    //	--------------------------------------------
    //	fValidInputFields
    //	--------------------------------------------		
    fValidInputFields: function() {
      
      // if (parseFloat(this.getView().byId("ipRequestedValue").getValue()) <= 0 || this.getView().byId("dtValidFrom").getValue() == "" || 
      // 	this.getView().byId("dtValidTo").getValue() == "" || this.getView().byId("dtDateCred").getValue() == "") {
      // 	return true;
      // }
      
      // return false; 
    },
    
    // --------------------------------------------
    // fFillCreateEmergencyLoanData
    // -------------------------------------------- 		
    fFillCreateEmergencyLoanData: function(oCreate, that) {
      var oActualModel = that.getView().getModel("ET_BLOCK").getData();
      var dataFrom = that.getView().byId("dtValidFrom").getValue();
      var dataTo = that.getView().byId("dtValidTo").getValue();
      var dataCred = that.getView().byId("dtDateCred").getValue();
      
      oCreate.BLOCK.ACTIO = "INS";
      oCreate.BLOCK.VALID_FROM = dataFrom.substring(6, 10) + dataFrom.substring(3, 5) + dataFrom.substring(0, 2);
      oCreate.BLOCK.VALID_TO = dataTo.substring(6, 10) + dataTo.substring(3, 5) + dataTo.substring(0, 2);
      oCreate.BLOCK.DATE_CRED = dataCred.substring(6, 10) + dataCred.substring(3, 5) + dataCred.substring(0, 2);
      oCreate.BLOCK.VALUE_APP = oActualModel.VALUE_APP;
      oCreate.BLOCK.VALUE_MAX = oActualModel.VALUE_MAX;
      oCreate.BLOCK.VALUE_SOL = oActualModel.VALUE_SOL;
      
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
      oCreate.OBSERVATION = that.getView().byId("taJust").getValue();
      
      if (oCreate.IM_LOGGED_IN == 5) {
        oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
      }
      
      that.fFillCreateEmergencyLoanData(oCreate, that);
      
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
          that.setDocumentStatus(oGlobalData.IM_REQUISITION_ID,action);
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
        oModel.create("ET_VEHICLE_FINAN", oCreate, null, fSuccess, fError);
      },
      
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onSend: function() {
        
        this.validValue();
        
        var valid = this.validAttachment();
        
        if (valid === false) {
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
        
        if (this.getView().byId("taJustSSG").getValue() === "") {
          this.handleErrorMessageBoxDisapprove();
          return;
        }
        
        this.fActions(this, "cancelamento", "C");
      },
      
      // --------------------------------------------
      // onPressQuickView
      // -------------------------------------------- 
      onPressQuickView: function() {
        this._Dialog = sap.ui.xmlfragment("cadastralMaintenance.helpTextFiles.QuickViewHelpInsurance", this);
        this._Dialog.open();
      },
      // --------------------------------------------
      // onClose
      // -------------------------------------------- 
      onClose: function() {
        this._Dialog.close();
      },
      
      onBeforeUpload: function(oEvent) {
        
        var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
        var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
        var filename = oEvent.getParameter("fileName");
        var type = this.getView().getModel("ET_BLOCK").getData().TYPE;
        var caracteristica = "FORMULARIOFINANVEIC";
        const uploadCollection = this.getView().byId("UploadCollection");
        const conta_anexos =  uploadCollection.getItems().length;
        
        if (req == '00000000') {
          return;
        }
        var dados = "";
        if(this.settingStatus){
          dados = "BENEFICIOS;BDV;" + req + ";STATUS;" + conta_anexos + ";S;" + pernr;
        }else{
          // FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
          dados = filename + ";BDV;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;
        }
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
          this.getAttachment(req, "BDV");
        }
      },
      
      onChange: function(oEvent) {
        this.fVerifyChange(this);
      },
      onChangeValueSol: function() {
        var value = this.validValue();
        
        if (value === false) {
          return;
        }
        
        this.fVerifyChange(this);
        
      },
      
      onChangeDtCred: function() {
        
        var dia = this.getView().byId("dtDateCred").getValue().substring(0, 2);
        var mes = this.getView().byId("dtDateCred").getValue().substring(3, 5);
        var ano = this.getView().byId("dtDateCred").getValue().substring(6, 10);
        
        // - Consistir data credito, não pode ser no passado
        var data = new Date(),
        diaa = data.getDate().toString(),
        diaF = (diaa.length == 1) ? "0" + diaa : diaa,
        mesa = (data.getMonth() + 1).toString(), //+1 pois no getMonth Janeiro começa com zero.
        mesF = (mesa.length == 1) ? "0" + mesa : mesa,
        anoF = data.getFullYear();
        
        var begda = ano + mes + dia;
        var atual = anoF + mesF + diaF;
        
        if (begda < atual) {
          MessageBox.error("Data não pode ser inferior a data atual");
          var dtDateCred = this.getView().byId("dtDateCred").getValue();
          dtDateCred = "";
          this.getView().byId("dtDateCred").setValue(dtDateCred);
          
        } else {
          //Setar Janeiro do proximo ano caso seja Dezembro
          if (mes == "12") {
            mes = 1;
            ano++;
          } else {
            mes++;
          }
          
          var mesS = mes.toString();
          
          if (mes < 10) {
            mes = "0" + mesS;
          } else {
            mes = mesS;
          }
          
          //Setar valor na data "Valido De"
          var dtValidFrom = "01" + "-" + mes + "-" + ano;
          this.getView().byId("dtValidFrom").setValue(dtValidFrom);
        }
      },
      
      onFormulario: function() {
        
        var that = this;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_FINAC_VEIC_SRV/");
        
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
        
        if (this.fObligatoryFields() === false) {
          return;
        }
        
        var model = this.getView().getModel("ET_BLOCK").getData();
        
        // IvBegda – Início Validade
        var data = this.getView().byId("dtValidFrom").getValue();
        var IvBegda = data.substring(6, 10) + data.substring(3, 5) + "01";
        // IvEndda – Fim validade
        data = this.getView().byId("dtValidTo").getValue();
        var IvEndda = data.substring(6, 10) + data.substring(3, 5) + "01";
        // IvValApr – Valor Apoximado
        var IvValApr = model.VALUE_APP;
        // IvValSoli – Valor Solicitado
        var IvValSoli = model.VALUE_SOL;
        // IvDtCred – Data Crédito
        data = this.getView().byId("dtDateCred").getValue();
        var IvDtCred = data.substring(6, 10) + data.substring(3, 5) + data.substring(0, 2);
        
        var url = "?$filter=IvBegda eq '" + IvBegda + "' and IvEndda eq '" + IvEndda + "' and IvValApr eq '" + IvValApr +
        "' and IvValSoli eq '" + IvValSoli + "' and IvDtCred eq '" + IvDtCred + "'";
        //MAIN READ
        oModel.read("FinancVeiculoSet" + url, null, null, false, fSuccess, fError);
        
      },
      fObligatoryFields: function() {
        
        if (parseFloat(this.getView().byId("ipRequestedValue").getValue()) <= 0 || this.getView().byId("dtValidFrom").getValue() == "" ||
        this.getView().byId("dtValidTo").getValue() == "" || this.getView().byId("dtDateCred").getValue() == "") {
          this.handleErrorMessageBoxPress();
          return false;
        }
        
      },
      
      onChangeDtTo: function() {
        var dtFrom = this.getView().byId("dtValidFrom").getValue();
        var dtTo = this.getView().byId("dtValidTo").getValue();
        
        var mesf = dtFrom.substring(3, 5);
        var mest = dtTo.substring(3, 5);
        var anof = dtFrom.substring(6, 10);
        var anot = dtTo.substring(6, 10);
        
        var dif = ((((anot - anof) * 12) + Number(mest)) - mesf);
        if (dif > 36) {
          MessageBox.error("A validade final não pode ser maior que 36 meses a partir da validade inicial");
          dtTo = "";
          this.getView().byId("dtValidTo").setValue(dtTo);
        }
      },
      
      validValue: function() {
        var model = this.getView().getModel("ET_BLOCK").getData();
        if (parseFloat(model.VALUE_MAX) <= 0) {
          return true;
        }
        
        if (parseFloat(model.VALUE_SOL) > parseFloat(model.VALUE_MAX)) {
          var valSolic = this.getView().byId("ipRequestedValue").getValue();
          valSolic = "";
          this.getView().byId("ipRequestedValue").setValue(valSolic);
          var message = "Valor solicitado acima do limite de " + parseFloat(model.VALUE_MAX);
          MessageBox.error(message);
          return false;
        }
        return true;
      }
      
    });
    
  });