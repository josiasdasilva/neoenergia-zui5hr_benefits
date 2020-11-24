sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "cadastralMaintenance/view/BaseController",
  "cadastralMaintenance/formatter/Formatter",
  "sap/ui/model/json/JSONModel",
  "sap/m/Dialog",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel, Dialog) {
  "use strict";
  
  return BaseController.extend("cadastralMaintenance.view.DetailEduIncentive", {
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
      this.fSearchHelps(this, this.getView().getModel("ET_HEADER").getData().PERNR);
    },
    
    setParticProgFieldsVisibility: function (visible) {
      this.getView().byId("lblDescProg").setVisible(visible);
      this.getView().byId("ipDescProg").setVisible(visible);
      this.getView().byId("lblEncBolsa").setVisible(visible);
      this.getView().byId("ipEncBolsa").setVisible(visible);
    },
    //	--------------------------------------------
    //	fGetBlock
    //	--------------------------------------------		
    fGetBlock: function () {
      var that = this;
      var empresa = that.getView().getModel("ET_HEADER").getData().BUKRS;
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
      
      var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
      
      var oModelDep = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      // this.fSetSearchHelpValue(oModelDep, "ET_SH_DEPENDENTS");
      
      if (empresa != "NEO") {
        that.getView().byId("btnForms").setVisible(false);
      }
      
      if (oGlobalData.IM_LOGGED_IN === 0) {
        this.getView().setModel(new sap.ui.model.json.JSONModel({
          TYPE_REQ: "R",
          INC_RECEBIDO: "",
          PRI_FORM: ""
        }), "ET_BLOCK");
        return;
      }
      
      var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
      
      //initial state
      this.setParticProgFieldsVisibility(this.getView().byId("sJaPartic").getSelectedKey() === "S");

      function fSuccess(oEvent) {
        var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
        if (parseFloat(oEvent.BLOCK.VALUE_APPR) <= 0) {
          oEvent.BLOCK.VALUE_APPR = oEvent.BLOCK.VALUE;
        }
        
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
          
          that.getView().byId("btnForms").setVisible(false);
          if (oEvent.BLOCK.TYPE_REQ == "P") {
            if (empresa === "NEO") {
              that.getView().byId("formNeoEdu").setVisible(true);
            } else {
              that.getView().byId("formElekEdu").setVisible(true);
            }
            that.fUnableFields();
          }

          var filters = [];
          
          filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];
          
          that.getView().setModel(oModel, "anexo");
          
          // Update list binding
          // that.getView().byId("upldAttachments").getBinding("items").filter(filters);
        }
        
        that.setParticProgFieldsVisibility(oValue.JA_PARTIC_PRG_EST === "S");
        that.getView().setModel(oValue, "ET_BLOCK");
        
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
          that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BIE");
        }
        if (oGlobalData.IM_LOGGED_IN !== 0) {
          if (empresa == "NEO") {
            that.getView().byId("lblPerc").setVisible(true);
            that.getView().byId("ipPerc").setVisible(true);
            that.getView().byId("ipPerc").setEnabled(true);
            that.getView().byId("lblBetrgAdm").setVisible(true);
            that.getView().byId("ipBetrgAdm").setVisible(true);
            that.getView().byId("ipBetrgAdm").setEnabled(true);
          } else {
            that.getView().byId("slEduIncType").setVisible(false);
            that.getView().byId("ipEduIncTypeADP").setVisible(true);
          }
        }
        if (empresa != "NEO") {
          that.getView().byId("btnForms").setVisible(false);
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
      oModel.read("ET_EDUCATIONAL_INCENTIVE" + urlParam, null, null, false, fSuccess, fError);
    },
    
    //	--------------------------------------------
    //	fUnableFields
    //	--------------------------------------------		
    fUnableFields: function () {
      var oView = this.getView();
      oView.byId("UploadCollection").setUploadButtonInvisible(true);
      oView.byId("slSolType").setEnabled(false);
      oView.byId("slEduIncType").setEnabled(false);
      oView.byId("dtMesRef").setEnabled(false);
      oView.byId("ipBetrg").setEnabled(false);
      oView.byId("ipPerc").setEnabled(false);
      oView.byId("ipBetrgAdm").setEnabled(false);
      oView.byId("ipNomeCurso").setEnabled(false);
      oView.byId("ipCargaHoraria").setEnabled(false);
      oView.byId("dtDataInicio").setEnabled(false);
      oView.byId("dtDataFim").setEnabled(false);
      oView.byId("ipInstituicao").setEnabled(false);
      oView.byId("ipTelInstituicao").setEnabled(false);
      oView.byId("ipLocalInstituicao").setEnabled(false);
      oView.byId("slRecebeuInc").setEnabled(false);
      oView.byId("slPriForm").setEnabled(false);
      oView.byId("ipDescricao").setEnabled(false);
      
      oView.byId("ipEmail").setEnabled(false);
      oView.byId("ipGerencia").setEnabled(false);
      oView.byId("ipLocTrab").setEnabled(false);
      oView.byId("ipCelular").setEnabled(false);
      oView.byId("ipRamal").setEnabled(false);
      oView.byId("ipUltForm").setEnabled(false);
      oView.byId("ipCursoSol").setEnabled(false);
      oView.byId("ipTipoCurso").setEnabled(false);
      oView.byId("ipNomeInstEns").setEnabled(false);
      oView.byId("ipEmailInst").setEnabled(false);
      oView.byId("ipTelInst").setEnabled(false);
      oView.byId("ipPesContato").setEnabled(false);
      oView.byId("ipLocCurso").setEnabled(false);
      oView.byId("ipCargaHorariaElek").setEnabled(false);
      oView.byId("ipRegCurso").setEnabled(false);
      oView.byId("dtInicio").setEnabled(false);
      oView.byId("dtFim").setEnabled(false);
      oView.byId("ipValorMen").setEnabled(false);
      oView.byId("ipObjetivo").setEnabled(false);
      oView.byId("ipDescProg").setEnabled(false);
      oView.byId("ipEncBolsa").setEnabled(false);
      // oView.byId("rbAcordo").setEnabled(false);
      
      oView.byId("taJust").setEnabled(false);
      oView.byId("sJaPartic").setEnabled(false);
    },
    //	--------------------------------------------
    //	fUnableAllButtons
    //	--------------------------------------------			
    fUnableAllButtons: function () {
      var oView = this.getView();
      
      oView.byId("btnForms").setVisible(false);
      oView.byId("btnApprove").setVisible(false);
      oView.byId("btnAccept").setVisible(false);
      oView.byId("btnCancel").setVisible(false);
    },
    //	--------------------------------------------
    //	fSearchHelps
    //	--------------------------------------------		
    fSearchHelps: function (that, pernr) {
      var oEntry = [];
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      var urlParam = null;
      
      that.Benef = new JSONModel();
      that.Benef.setData({
        table: []
      });
      
      if (pernr !== undefined && pernr !== null && pernr !== "") {
        urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
      }
      
      function fSuccess(oEvent) {
        for (var i = 0; i < oEvent.results.length; i++) {
          oEntry = {
            key: oEvent.results[i].BPLAN,
            desc: oEvent.results[i].LTEXT
          };
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
      
      oModel.read("ET_SH_TYPE_EDU_INC", null, urlParam, false, fSuccess, fError);
    },
    // --------------------------------------------
    // fFillCreateEduIncData
    // -------------------------------------------- 		
    fFillCreateEduIncData: function (oCreate, that) {
      var oActualModel = that.getView().getModel("ET_BLOCK").getData();
      var empresa = that.getView().getModel("ET_HEADER").getData().BUKRS;
      
      oCreate.BLOCK.ACTIO = "INS";
      oCreate.BLOCK.TYPE_REQ = oActualModel.TYPE_REQ;
      oCreate.BLOCK.MES_REF = oActualModel.MES_REF;
      oCreate.BLOCK.BETRG = oActualModel.BETRG;
      if (oCreate.BLOCK.REQUISITION_ID == "00000000" || oCreate.BLOCK.REQUISITION_ID == undefined) {
        oCreate.BLOCK.DT_SOLICIT = that.dataAtualFormatada();
      } else {
        oCreate.BLOCK.DT_SOLICIT = oActualModel.DT_SOLICIT;
        oCreate.BLOCK.PERCENTUAL = oActualModel.PERCENTUAL;
        oCreate.BLOCK.BETRG_ADM = oActualModel.BETRG_ADM;
      }
      
      if (empresa == "NEO") {
        oCreate.BLOCK.TYPE_INC = oActualModel.TYPE_INC;
        if (oActualModel.TYPE_REQ == "P") {
          oCreate.BLOCK.CURSO = oActualModel.CURSO;
          oCreate.BLOCK.INSTITUICAO = oActualModel.INSTITUICAO;
          oCreate.BLOCK.TELEFONE = oActualModel.TELEFONE;
          oCreate.BLOCK.CIDADE = oActualModel.CIDADE;
          oCreate.BLOCK.INC_RECEBIDO = oActualModel.INC_RECEBIDO;
          oCreate.BLOCK.PRI_FORM = oActualModel.PRI_FORM;
          oCreate.BLOCK.BEGDA = oActualModel.BEGDA;
          oCreate.BLOCK.ENDDA = oActualModel.ENDDA;
          oCreate.BLOCK.OBSERVACAO = oActualModel.OBSERVACAO;
          oCreate.BLOCK.CARGA_HORARIA = oActualModel.CARGA_HORARIA;
        }
      } else {
        if (oActualModel.TYPE_INC_ELEK == "" || oActualModel.TYPE_INC_ELEK == undefined) {
          oCreate.BLOCK.TYPE_INC_ELEK = this.getView().byId("slEduIncType").getSelectedItem().getText();
        } else {
          oCreate.BLOCK.TYPE_INC_ELEK = oCreate.BLOCK.TYPE_INC_ELEK;
        }
        
        if (oActualModel.TYPE_REQ == "P") {
          oCreate.BLOCK.EMAIL = oActualModel.EMAIL;
          oCreate.BLOCK.GERENCIA = oActualModel.GERENCIA;
          oCreate.BLOCK.PHONE = oActualModel.PHONE;
          oCreate.BLOCK.RAMAL = oActualModel.RAMAL;
          oCreate.BLOCK.ULT_FORM = oActualModel.ULT_FORM;
          oCreate.BLOCK.CURSO_SOLICIT = oActualModel.CURSO_SOLICIT;
          oCreate.BLOCK.TIPO_CURSO = oActualModel.TIPO_CURSO;
          oCreate.BLOCK.NOME_INST = oActualModel.NOME_INST;
          oCreate.BLOCK.EMAIL_INST = oActualModel.EMAIL_INST;
          oCreate.BLOCK.TEL_INST = oActualModel.TEL_INST;
          oCreate.BLOCK.PESSOA_CONTATO = oActualModel.PESSOA_CONTATO;
          oCreate.BLOCK.LOCAL_CURSO = oActualModel.LOCAL_CURSO;
          oCreate.BLOCK.CARGA_HORARIA = oActualModel.CARGA_HORARIA;
          oCreate.BLOCK.REGIME_CURSO = oActualModel.REGIME_CURSO;
          oCreate.BLOCK.BEGDA = oActualModel.BEGDA;
          oCreate.BLOCK.ENDDA = oActualModel.ENDDA;
          oCreate.BLOCK.VALOR_MEN = oActualModel.VALOR_MEN;
          oCreate.BLOCK.OBJETIVO = oActualModel.OBJETIVO;
          oCreate.BLOCK.PROG_BOLSA = oActualModel.PROG_BOLSA;
          oCreate.BLOCK.DESCR_PROG = oActualModel.DESCR_PROG;
          oCreate.BLOCK.ENC_BOLSA = oActualModel.ENC_BOLSA;
          oCreate.BLOCK.ACORDO = oActualModel.ACORDO;
        }
      }
    },
    dataAtualFormatada: function () {
      var data = new Date(),
      dia = data.getDate().toString(),
      diaF = (dia.length == 1) ? "0" + dia : dia,
      mes = (data.getMonth() + 1).toString(), //+1 pois no getMonth Janeiro começa com zero.
      mesF = (mes.length == 1) ? "0" + mes : mes,
      anoF = data.getFullYear();
      return anoF + mesF + diaF;
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
      
      that.fFillCreateEduIncData(oCreate, that);
      
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
        oModel.create("ET_EDUCATIONAL_INCENTIVE", oCreate, null, fSuccess, fError);
      },
      
      
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onSend: function () {
        var that = this;
        
        var oblig = this.fObligatoryFields();
        
        if (oblig === false) {
          this.handleErrorMessageBoxPress();
          return;
        }
        
        var valid = this.validAttachment();
        
        if (valid === false) {
          return;
        }
        
        if(!this.isAcordoSelectionOk()){
          MessageBox.error("Favor marcar campo De Acordo");
        }

        that.fActions(that, "envio", "S");
      },
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onApprove: function () {
        var block = this.getView().getModel("ET_BLOCK").getData();
        var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
        
        if (empresa == "NEO") {
          if (block.BETRG_ADM == "" || block.BETRG_ADM == undefined) {
            this.handleErrorMessageBoxPress();
            return;
          } else {
            this.fActions(this, "aprovar", "A");
          }
        } else {
          this.fActions(this, "aprovar", "A");
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
        
        if (this.getView().byId("taJustSSG").getValue() === "") {
          this.handleErrorMessageBoxDisapprove();
          return;
        }
        
        this.fActions(this, "cancelamento", "C");
      },
      
      onBeforeUpload: function (oEvent) {
        
        var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
        var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
        var filename = oEvent.getParameter("fileName");
        var block = this.getView().getModel("ET_BLOCK").getData();
        var caracteristica;
        
        if (req == '00000000') {
          return;
        }
        
        if (block.TYPE_REQ == "P") {
          caracteristica = "FORMULARIO";
        } else if (block.TYPE_REQ == "R") {
          caracteristica = "COMPROVANTE";
        }
        
        // FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
        var dados = filename + ";BIE;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;
        
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
          this.getAttachment(req, "BIE");
        }
      },
      fFillDependentDetail: function (selectedRow) {
        var oView = this.getView();
        if (selectedRow != undefined) {
          oView.byId("slFullName").setSelectedKey(selectedRow.FCNAM);
          oView.byId("slMemberType").setSelectedKey(selectedRow.TYPE_DEPEN);
        }
      },
      onChangeSol: function (oEvent) {
        var key = oEvent.getSource().getSelectedKey();
        var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
        
        if (empresa == "NEO") {
          if (key == "R") {
            this.getView().byId("formNeoEdu").setVisible(false);
          } else if (key == "P") {
            this.getView().byId("formNeoEdu").setVisible(true);
          }
        } else {
          if (key == "R") {
            this.getView().byId("formElekEdu").setVisible(false);
          } else if (key == "P") {
            this.getView().byId("formElekEdu").setVisible(true);
          }
        }
        
      },
      onFormulario: function () {
        
        var that = this;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_EDU_INC_SRV/");
        var block = this.getView().getModel("ET_BLOCK").getData();
        var url;
        //validate first
        this.fValidateRequisition();
        const isValid = () => {
          const valueState = this.getView().byId("dtMesRef").getValueState();
          if (valueState !== sap.ui.core.ValueState.None) {
            return false;
          }
          return true;
        }
        
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
        
        var oblig = this.fObligatoryFields();
        
        if (oblig === false && isValid()) {
          this.handleErrorMessageBoxPress();
          return;
        }
        
        if (block.TYPE_REQ == "P") {
          var IV_PERNR = this.getView().getModel("ET_HEADER").getData().PERNR;
          var IV_INC_EDUC = block.TYPE_INC;
          var IV_CURSO = block.CURSO;
          var IV_CARGA_HORARIA = block.CARGA_HORARIA;
          var IV_DATA_INICIO = block.BEGDA.substring(0, 6);
          var IV_DATA_FIM = block.ENDDA.substring(0, 6);
          var IV_INSTITUICAO = block.INSTITUICAO;
          var IV_TEL_INS = block.TELEFONE;
          var IV_CIDADE_INS = block.CIDADE;
          var IV_VLR_MENSALIDADE = block.BETRG;
          var IV_INCENTIVO = block.INC_RECEBIDO;
          var IV_TEXT_INCENTIVO = block.OBSERVACAO;
          var IV_FIRST_FORMACAO = block.PRI_FORM;
          
          if (IV_TEXT_INCENTIVO == undefined) {
            IV_TEXT_INCENTIVO = "";
          }
          
          url = "EduIncFormAdesaoSet?$filter=IV_PERNR eq '" + IV_PERNR + "' and IV_INC_EDUC eq '" + IV_INC_EDUC + "' and IV_CURSO eq '" +
          IV_CURSO +
          "' and IV_CARGA_HORARIA eq '" + IV_CARGA_HORARIA + "' and IV_DATA_INICIO eq '" + IV_DATA_INICIO + "' and IV_DATA_FIM eq '" +
          IV_DATA_FIM +
          "' and IV_INSTITUICAO eq '" +
          IV_INSTITUICAO + "' and IV_TEL_INS eq '" + IV_TEL_INS + "' and IV_CIDADE_INS eq '" + IV_CIDADE_INS +
          "' and IV_VLR_MENSALIDADE eq '" +
          IV_VLR_MENSALIDADE + "' and IV_INCENTIVO eq '" + IV_INCENTIVO + "' and IV_TEXT_INCENTIVO eq '" +
          IV_TEXT_INCENTIVO + "' and IV_FIRST_FORMACAO eq '" + IV_FIRST_FORMACAO + "'";
        } else if (block.TYPE_REQ == "R") {
          IV_PERNR = this.getView().getModel("ET_HEADER").getData().PERNR;
          IV_INC_EDUC = block.TYPE_INC;
          var IV_MES_REF = block.MES_REF.substring(0, 6);
          var IV_VALOR = block.BETRG;
          
          url = "EduIncFormReembolsoSet?$filter=IV_PERNR eq '" + IV_PERNR + "' and IV_INC_EDUC eq '" + IV_INC_EDUC + "' and IV_MES_REF eq '" +
          IV_MES_REF +
          "' and IV_VALOR eq '" + IV_VALOR + "'";
        }
        
        // var data = this.getView().byId("dtPeriodFrom").getValue();
        
        // var IvTpAux = this.getView().byId("cbTypeAux").getValue();
        // var IvPeriodo = data.substring(6, 10) + data.substring(3, 5);
        // var IvOpPer = this.getView().byId("slSolType").getSelectedKey();
        // var IvValAux = block.BETRG;
        // var IvNomeDep = block.FCNAM;
        // var IvInstBaba = block.INSTITUICAO;;
        // var IvCnpjCpf = block.CNPJ_INST;
        // var IvTpSoli;
        
        // if (IvCnpjCpf == undefined) {
        // 	IvCnpjCpf = "";
        
        // }
        
        //MAIN READ
        
        if(!this.isAcordoSelectionOk()) MessageBox.error("Favor marcar campo De Acordo");
        if(isValid() && this.isAcordoSelectionOk()) {
          oModel.read(url, null, null, false, fSuccess, fError);
        }
      },
      fObligatoryFields: function () {
        var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
        var block = this.getView().getModel("ET_BLOCK").getData();
        
        const initialCheck = () => {
          if (block.TYPE_INC == "" || block.TYPE_INC == undefined || block.TYPE_REQ == "" || block.TYPE_REQ == undefined || block.MES_REF ==
          "" || block.MES_REF == undefined || parseFloat(block.BETRG) <= 0 || block.BETRG == undefined) {
            return false;
          }
          
          if (empresa == "NEO" && block.TYPE_INC == "P") {
            if (block.CURSO == "" || block.CURSO == undefined || block.INSTITUICAO == "" || block.INSTITUICAO == undefined || block.TELEFONE ==
            "" || block.TELEFONE ==
            undefined || block.CIDADE == "" || block.CIDADE == undefined ||
            block.BEGDA == "" || block.BEGDA == undefined || block.ENDDA == "" ||
            block.ENDDA == undefined
            ) {
              return false;
            }
          }
          return true;
        }
        
        return initialCheck() && this.fRequiredFieldsAreOk();
        // if (model.TYPE_DEPEN == "" || model.TYPE_DEPEN == undefined || model.FCNAM == "" || model.FCNAM == undefined || model.TYPE_SOL ==
        // 	"" || model.TIP_AUX == "" || model.TIP_AUX == undefined || model.TYPE_SOL == undefined || parseFloat(model.BETRG) <= 0 || model.BETRG ==
        // 	"" || model.BETRG == undefined || model.INSTITUICAO ==
        // 	"" || model.INSTITUICAO == undefined) {
        // 	return false;
        // }
        
      },
      onMemberChange: function () {
        var results = this.getView().getModel("ET_DEPENDENTS").getData().results;
        var model = this.getView().getModel("ET_BLOCK");
        var encontrou = false;
        
        for (var i = 0; results.length > i; i++) {
          if (model.getData().FCNAM == results[i].FCNAM) {
            model.getData().TYPE_DEPEN = results[i].TYPE_DEPEN;
            model.getData().IDADE = results[i].IDADE;
            model.getData().IDADE_MES = results[i].IDADE_MES;
            model.getData().IDADE_DIA = results[i].IDADE_DIA;
            model.getData().MGUA_ERROR = results[i].MGUA_ERROR;
            this.getView().setModel(model, "ET_BLOCK");
            encontrou = true;
          }
        }
        if (encontrou === true) {
          this.onRegras();
        }
        
      },
      fRecebInc: function (oEvent) {
        if (oEvent.getSource().getSelectedKey() == "") {
          this.getView().byId("ipDescricao").setEnabled(false);
        } else {
          this.getView().byId("ipDescricao").setEnabled(true);
        }
        
      },
      
      //on change for field "Mês referência"
      onChangeMesRef: function(oEvent) {
        this.fValidateRequisition();
      },
      //call gateway service to validate the requisition
      fValidateRequisition: function () {
        var oValidate = {};
        
        oValidate.BLOCK = {};
        oValidate.IM_PERNR = this.getView().getModel("ET_HEADER").getData().PERNR;
        
        this.fFillCreateEduIncData(oValidate, this);
        
        //callback
        const that = this;
        function fCallback(oEvent) {
          if(oEvent && oEvent.BLOCK && oEvent.BLOCK.OBSERVACAO && oEvent.BLOCK.OBSERVACAO !== ""){
            that.getView().byId("dtMesRef").setValueState(sap.ui.core.ValueState.Error);
            MessageBox.error(oEvent.BLOCK.OBSERVACAO);
          }else{
            that.getView().byId("dtMesRef").setValueState(sap.ui.core.ValueState.None);
          }
        }
        
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
        oModel.create("ET_VALIDATE_EDUCATION_INCENTIVES", oValidate, null, fCallback, fCallback);
      },
      fFieldIsEmpty: function (id) {
        const field = this.getView().byId(id);
        const isVisible = field.getProperty("visible");
        if(!isVisible) return false;
        const value = field.getValue();
        if(value == "") return true;
        return false;
      },
      fRequiredFieldsAreOk: function () {
        var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
        var allOk = true;
        const selType = this.getView().byId('slSolType').getSelectedKey();
        
        if(this.fFieldIsEmpty('ipEduIncTypeADP')) allOk = false;
        if(this.fFieldIsEmpty('dtMesRef')) allOk = false;
        if(this.fFieldIsEmpty('ipBetrg')) allOk = false;
        if(this.fFieldIsEmpty('ipBetrgAdm')) allOk = false;
        if(selType === "P"){
          if(empresa === "NEO"){
            //Neo
            if(this.fFieldIsEmpty('ipNomeCurso')) allOk = false;
            if(this.fFieldIsEmpty('ipCargaHoraria')) allOk = false;
            if(this.fFieldIsEmpty('dtDataInicio')) allOk = false;
            if(this.fFieldIsEmpty('dtDataFim')) allOk = false;
            if(this.fFieldIsEmpty('ipInstituicao')) allOk = false;
            if(this.fFieldIsEmpty('ipTelInstituicao')) allOk = false;
            if(this.fFieldIsEmpty('ipLocalInstituicao')) allOk = false;
          }else{
            //Elektro
            if(this.fFieldIsEmpty('ipEmail')) allOk = false;
            if(this.fFieldIsEmpty('ipGerencia')) allOk = false;
            if(this.fFieldIsEmpty('ipLocTrab')) allOk = false;
            if(this.fFieldIsEmpty('ipCelular')) allOk = false;
            if(this.fFieldIsEmpty('ipRamal')) allOk = false;
            if(this.fFieldIsEmpty('ipUltForm')) allOk = false;
            if(this.fFieldIsEmpty('ipCursoSol')) allOk = false;
            if(this.fFieldIsEmpty('ipTipoCurso')) allOk = false;
            if(this.fFieldIsEmpty('ipNomeInstEns')) allOk = false;
            if(this.fFieldIsEmpty('ipEmailInst')) allOk = false;
            if(this.fFieldIsEmpty('ipTelInst')) allOk = false;
            if(this.fFieldIsEmpty('ipPesContato')) allOk = false;
            if(this.fFieldIsEmpty('ipLocCurso')) allOk = false;
            if(this.fFieldIsEmpty('ipCargaHorariaElek')) allOk = false;
            if(this.fFieldIsEmpty('ipRegCurso')) allOk = false;
            if(this.fFieldIsEmpty('dtInicio')) allOk = false;
            if(this.fFieldIsEmpty('dtFim')) allOk = false;
            if(this.fFieldIsEmpty('ipValorTot')) allOk = false;
            if(this.fFieldIsEmpty('ipValorMen')) allOk = false;
            if(this.fFieldIsEmpty('ipObjetivo')) allOk = false;
            
            const jaPartic = this.getView().byId('sJaPartic').getSelectedKey();
            if(jaPartic==="S"){
              if(this.fFieldIsEmpty('ipDescProg')) allOk = false;
              if(this.fFieldIsEmpty('ipEncBolsa')) allOk = false;
            }
          }
        }
        return allOk;
      },
      onChangeParticBolsa: function(oEvent) {
        const value = oEvent.getSource().getSelectedKey();
        //show/hide fields 
        this.setParticProgFieldsVisibility(value === "S")
      },
      isAcordoSelectionOk: function(){
        var empresa = this.getView().getModel("ET_HEADER").getData().BUKRS;
        const selType = this.getView().byId('slSolType').getSelectedKey();
        
        if(selType === "P" && empresa !== "NEO"){
          return this.getView().byId('cbDeAcordo').getSelected();
        }
        return true;
      },
      showQuickViewValorMensal: function (oEvent) {
        var oBundle = this.getView().getModel("i18n").getResourceBundle();
        var oQuickViewModelText;
        oQuickViewModelText = new sap.ui.model.json.JSONModel({
          text: oBundle.getText("valor_mensal_help_text"),
          header: oBundle.getText("valor_mensal_curso")
        });
        this._Dialog = sap.ui.xmlfragment("cadastralMaintenance.view.QuickView", this);
        sap.ui.getCore().setModel(oQuickViewModelText, "ET_QUICK_VIEW_TEXT");
        this._Dialog.open();
      },
      onClose: function (oEvent) {
        this._Dialog.close();
      }
    })
  });
