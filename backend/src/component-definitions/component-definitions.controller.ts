import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ComponentDefinition } from './component-definitions.models';
import { ComponentDefinitionsService } from './component-definitions.service';
import { ComponentDefinitionDto } from './dto/component-definition.dto';

@ApiTags('component-definitions')
@Controller('component-definitions')
export class ComponentDefinitionsController {
  constructor(
    private readonly componentDefinitionsService: ComponentDefinitionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List whitelisted component definitions' })
  @ApiOkResponse({ type: ComponentDefinitionDto, isArray: true })
  getAll(): readonly ComponentDefinition[] {
    return this.componentDefinitionsService.getAll();
  }
}
